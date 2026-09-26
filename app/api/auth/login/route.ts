import { NextResponse } from "next/server";
import { isValidEmail, normalizeEmail } from "@/lib/auth/session";
import { issueSessionForEmail, jsonWithSession } from "@/lib/auth-session";
import { getSupabasePublicAuthClient } from "@/lib/supabase-admin";
import {
  getSupabaseAnonKey,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from "@/lib/supabase-env";
import {
  isSupabaseNetworkFailure,
  logSupabaseNetworkFailure,
  SUPABASE_NETWORK_ENV_MESSAGE,
} from "@/lib/supabase-network";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CREDENTIALS_ERROR = "メールアドレスまたはパスワードが正しくありません";
const NETWORK_ERROR = "通信に失敗しました。しばらくしてから再度お試しください。";
const UNCONFIRMED_ERROR =
  "メールアドレスの確認が完了していません。確認メール内のリンクをクリックしてください。";

export async function POST(req: Request) {
  try {
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
    if (!password) {
      return NextResponse.json({ error: CREDENTIALS_ERROR }, { status: 400 });
    }

    const url = getSupabaseUrl();
    const key = getSupabaseAnonKey() || getSupabaseServiceRoleKey();
    if (!url || !key) {
      console.error(SUPABASE_NETWORK_ENV_MESSAGE, {
        hasUrl: Boolean(url),
        hasKey: Boolean(key),
      });
      return NextResponse.json({ error: NETWORK_ERROR }, { status: 500 });
    }

    const supabase = getSupabasePublicAuthClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      logSupabaseNetworkFailure("auth.login", error);
      const message = error.message || "";
      const status = (error as { status?: number }).status;
      if (error instanceof TypeError || status === 0 || isSupabaseNetworkFailure(error)) {
        return NextResponse.json({ error: NETWORK_ERROR }, { status: 502 });
      }
      if (/email not confirmed|email_not_confirmed|not confirmed/i.test(message)) {
        return NextResponse.json({ error: UNCONFIRMED_ERROR }, { status: 403 });
      }
      return NextResponse.json({ error: CREDENTIALS_ERROR }, { status: 401 });
    }

    const userEmail = data.user?.email?.trim().toLowerCase();
    if (!data.session || !userEmail) {
      return NextResponse.json({ error: UNCONFIRMED_ERROR }, { status: 403 });
    }

    const issued = await issueSessionForEmail(userEmail);
    return jsonWithSession(issued.body, issued.cookie);
  } catch (error) {
    logSupabaseNetworkFailure("auth.login", error);
    if (isSupabaseNetworkFailure(error)) {
      return NextResponse.json({ error: NETWORK_ERROR }, { status: 502 });
    }
    const message = error instanceof Error ? error.message : String(error);
    console.error("[auth.login] failed:", message, error);
    return NextResponse.json({ error: CREDENTIALS_ERROR }, { status: 401 });
  }
}
