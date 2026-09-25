import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { jsonWithSession, issueSessionForEmail } from "@/lib/auth-session";
import { translateAuthError } from "@/lib/auth-errors";
import { getAccountWithCredits } from "@/lib/profiles";
import { getSupabaseAnonKey, getSupabaseServiceRoleKey, getSupabaseUrl } from "@/lib/supabase-env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      access_token?: unknown;
      grantBonus?: unknown;
    };
    const accessToken = typeof body.access_token === "string" ? body.access_token.trim() : "";
    if (!accessToken) {
      return NextResponse.json({ error: "認証トークンがありません。" }, { status: 400 });
    }

    const url = getSupabaseUrl();
    const key = getSupabaseAnonKey() || getSupabaseServiceRoleKey();
    if (!url || !key) {
      return NextResponse.json({ error: "認証サービスが設定されていません。" }, { status: 500 });
    }

    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data.user?.email) {
      return NextResponse.json(
        {
          error: translateAuthError(
            error || "セッションの有効期限が切れています。もう一度ログインしてください。",
          ),
        },
        { status: 401 },
      );
    }

    const email = data.user.email.trim().toLowerCase();
    const before = await getAccountWithCredits(email);
    const grantSignupBonus = body.grantBonus === true && !before.signup_bonus_granted;
    const issued = await issueSessionForEmail(email, { grantSignupBonus });
    const bonusGranted =
      !before.signup_bonus_granted && issued.account.signup_bonus_granted;
    return jsonWithSession({ ...issued.body, bonusGranted }, issued.cookie);
  } catch (err) {
    console.error("[auth.complete]", err);
    return NextResponse.json(
      { error: "認証に失敗しました。もう一度お試しください。" },
      { status: 500 },
    );
  }
}
