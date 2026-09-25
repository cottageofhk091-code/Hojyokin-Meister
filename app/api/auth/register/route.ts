import { NextResponse } from "next/server";
import { isValidEmail, normalizeEmail } from "@/lib/auth/session";
import { rawErrorMessage } from "@/lib/auth-errors";
import { sendSignupConfirmationEmail } from "@/lib/email";
import {
  getSupabaseAnonKey,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
  hasSupabaseAdminAuth,
} from "@/lib/supabase-env";
import {
  findAuthUserByEmail,
  generateAuthActionLink,
  getSupabaseAdmin,
  isAuthUserConfirmed,
} from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SENT_MESSAGE =
  "確認メールを送りました。メール内の確認ボタンをクリックしてください。この画面は開いたままお待ちください。";

function envSnapshot() {
  return {
    NEXT_PUBLIC_SUPABASE_URL: Boolean(getSupabaseUrl()),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(getSupabaseAnonKey()),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(getSupabaseServiceRoleKey()),
    RESEND_API_KEY: Boolean(process.env.RESEND_API_KEY?.trim()),
    AUTH_EMAIL_FROM: Boolean(
      process.env.AUTH_EMAIL_FROM?.trim() || process.env.EMAIL_FROM?.trim(),
    ),
    NEXT_PUBLIC_APP_URL: Boolean(process.env.NEXT_PUBLIC_APP_URL?.trim()),
  };
}

export async function POST(req: Request) {
  try {
    if (!hasSupabaseAdminAuth()) {
      const message =
        "SUPABASE_SERVICE_ROLE_KEY が未設定です。Supabase 標準メールを使わず Resend で送るため、サービスロールキーが必要です。";
      console.error("[auth.register]", message, envSnapshot());
      return NextResponse.json({ error: message }, { status: 500 });
    }
    if (!process.env.RESEND_API_KEY?.trim()) {
      return NextResponse.json(
        { error: "RESEND_API_KEY が未設定です。" },
        { status: 500 },
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      email?: unknown;
      password?: unknown;
    };
    const email = normalizeEmail(String(body.email ?? ""));
    const password = typeof body.password === "string" ? body.password : "";
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "メールアドレスの形式を確認してください。" },
        { status: 400 },
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "パスワードは6文字以上で入力してください" },
        { status: 400 },
      );
    }

    const existing = await findAuthUserByEmail(email);
    if (existing && isAuthUserConfirmed(existing)) {
      return NextResponse.json(
        { error: "このメールアドレスは既に登録されています" },
        { status: 409 },
      );
    }

    if (existing && !isAuthUserConfirmed(existing)) {
      const admin = getSupabaseAdmin();
      const { error: updateError } = await admin.auth.admin.updateUserById(
        existing.id,
        { password },
      );
      if (updateError) {
        throw new Error(`[updateUserById] ${updateError.message}`);
      }
    }

    let link;
    try {
      link = await generateAuthActionLink({ type: "signup", email, password, req });
    } catch (linkErr) {
      const detail = rawErrorMessage(linkErr);
      if (!/already registered|already been registered|user_already_exists/i.test(detail)) {
        throw linkErr;
      }
      const again = await findAuthUserByEmail(email);
      if (again && isAuthUserConfirmed(again)) {
        return NextResponse.json(
          { error: "このメールアドレスは既に登録されています" },
          { status: 409 },
        );
      }
      link = await generateAuthActionLink({ type: "magiclink", email, req });
    }

    const sent = await sendSignupConfirmationEmail(email, link.actionUrl);
    if (!sent.sent) {
      return NextResponse.json(
        { error: sent.error || "認証メールの送信に失敗しました" },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true, message: SENT_MESSAGE });
  } catch (err) {
    const message = rawErrorMessage(err);
    console.error("[auth.register] catch", { message, err, env: envSnapshot() });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
