import { NextResponse } from "next/server";
import { createClient, type EmailOtpType } from "@supabase/supabase-js";
import { getAppBaseUrl } from "@/lib/auth/base-url";
import { issueSessionForEmail } from "@/lib/auth-session";
import { getAccountWithCredits } from "@/lib/profiles";
import {
  getSupabaseAnonKey,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from "@/lib/supabase-env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OTP_TYPES = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

function isOtpType(value: string | null): value is EmailOtpType {
  return Boolean(value && OTP_TYPES.has(value as EmailOtpType));
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const base = getAppBaseUrl(req);
  const tokenHash = url.searchParams.get("token_hash");
  const typeRaw = url.searchParams.get("type");
  const code = url.searchParams.get("code");

  if (typeRaw === "recovery") {
    const dest = new URL("/auth/password-reset-notice", `${base}/`);
    dest.search = url.search;
    return NextResponse.redirect(dest);
  }

  if (code && !tokenHash) {
    const dest = new URL("/auth/continue", `${base}/`);
    dest.search = url.search;
    return NextResponse.redirect(dest);
  }

  if (tokenHash && isOtpType(typeRaw)) {
    const supabaseUrl = getSupabaseUrl();
    const anonKey = getSupabaseAnonKey() || getSupabaseServiceRoleKey();
    if (!supabaseUrl || !anonKey) {
      return NextResponse.redirect(`${base}/?auth=invalid`);
    }

    const supabase = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: typeRaw,
    });
    if (error || !data.user?.email) {
      console.error("[auth.callback] verifyOtp", error);
      return NextResponse.redirect(`${base}/?auth=invalid`);
    }

    const email = data.user.email.trim().toLowerCase();
    const before = await getAccountWithCredits(email);
    const grantSignupBonus =
      (typeRaw === "signup" || typeRaw === "email") && !before.signup_bonus_granted;
    const issued = await issueSessionForEmail(email, { grantSignupBonus });
    const bonusGranted =
      !before.signup_bonus_granted && issued.account.signup_bonus_granted;

    const res = NextResponse.redirect(
      typeRaw === "signup" || typeRaw === "email" || bonusGranted
        ? `${base}/auth/confirmed`
        : `${base}/`,
    );
    res.headers.append("Set-Cookie", issued.cookie);
    return res;
  }

  const dest = new URL("/auth/continue", `${base}/`);
  dest.search = url.search;
  dest.hash = url.hash;
  return NextResponse.redirect(dest);
}
