import { NextResponse } from "next/server";
import { isValidEmail, normalizeEmail } from "@/lib/auth/session";
import { sendPasswordResetEmail } from "@/lib/email";
import { hasSupabaseAdminAuth } from "@/lib/supabase-env";
import { findAuthUserByEmail, generateAuthActionLink } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GENERIC_OK =
  "パスワード再設定用のメールを送りました。メール内のボタンを押したあと、この画面に戻って新しいパスワードを入力してください。このタブは開いたままお待ちください。";

export async function POST(req: Request) {
  try {
    if (!hasSupabaseAdminAuth()) {
      return NextResponse.json(
        {
          error:
            "SUPABASE_SERVICE_ROLE_KEY が未設定です。Supabase 標準メールを使わず Resend で送るため、サービスロールキーが必要です。",
        },
        { status: 500 },
      );
    }

    const body = (await req.json().catch(() => ({}))) as { email?: unknown };
    const email = normalizeEmail(String(body.email ?? ""));
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "メールアドレスの形式を確認してください。" },
        { status: 400 },
      );
    }

    const existing = await findAuthUserByEmail(email);
    if (!existing) {
      return NextResponse.json({ ok: true, message: GENERIC_OK });
    }
    const link = await generateAuthActionLink({ type: "recovery", email, req });
    const sent = await sendPasswordResetEmail(email, link.actionUrl);
    if (!sent.sent) {
      return NextResponse.json(
        { error: sent.error || "パスワード再設定メールの送信に失敗しました" },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true, message: GENERIC_OK });
  } catch (err) {
    console.error("[auth.recovery]", err);
    return NextResponse.json(
      { error: "パスワード再設定メールの送信に失敗しました" },
      { status: 502 },
    );
  }
}
