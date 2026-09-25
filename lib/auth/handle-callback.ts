import { NextResponse } from "next/server";
import { getAppBaseUrl } from "@/lib/auth/base-url";
import { issueSessionForEmail } from "@/lib/auth-session";
import { getAccountWithCredits } from "@/lib/profiles";
import { verifyEmailOtp } from "@/lib/auth/verify-email-otp";

export async function handleEmailAuthCallback(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const base = getAppBaseUrl(req);
  const tokenHash = url.searchParams.get("token_hash");
  const typeRaw = url.searchParams.get("type");
  const code = url.searchParams.get("code");
  const registered = url.searchParams.get("registered") === "true";

  if (typeRaw === "recovery") {
    const dest = new URL("/auth/reset-password", `${base}/`);
    dest.search = url.search;
    return NextResponse.redirect(dest);
  }

  if (code && !tokenHash) {
    const dest = new URL("/auth/continue", `${base}/`);
    dest.search = url.search;
    dest.searchParams.set("registered", "true");
    return NextResponse.redirect(dest);
  }

  if (tokenHash) {
    try {
      const verified = await verifyEmailOtp({ tokenHash, typeRaw });
      const email = verified.email;
      const before = await getAccountWithCredits(email);
      const grantSignupBonus =
        (verified.type === "signup" ||
          verified.type === "email" ||
          typeRaw === "signup" ||
          typeRaw === "email" ||
          registered) &&
        !before.signup_bonus_granted;
      const issued = await issueSessionForEmail(email, { grantSignupBonus });
      const dest = new URL("/", `${base}/`);
      dest.searchParams.set("registered", "true");
      const res = NextResponse.redirect(dest);
      res.headers.append("Set-Cookie", issued.cookie);
      return res;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[auth.callback] verify failed:", message, {
        type: typeRaw,
        hasTokenHash: Boolean(tokenHash),
        error,
      });
      const dest = new URL("/auth/confirmed", `${base}/`);
      dest.searchParams.set("error", "1");
      dest.searchParams.set("reason", message.slice(0, 180));
      return NextResponse.redirect(dest);
    }
  }

  const dest = new URL("/auth/continue", `${base}/`);
  dest.search = url.search;
  dest.hash = url.hash;
  return NextResponse.redirect(dest);
}
