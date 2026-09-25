import { NextResponse } from "next/server";
import {
  createSessionToken,
  formatSessionCookieHeader,
} from "@/lib/auth/session";
import { getAccountWithCredits, grantSignupBonus } from "@/lib/profiles";

export async function issueSessionForEmail(
  email: string,
  opts?: { grantSignupBonus?: boolean },
) {
  const normalized = email.trim().toLowerCase();
  if (opts?.grantSignupBonus) {
    await grantSignupBonus(normalized);
  }
  const account = await getAccountWithCredits(normalized);
  const token = await createSessionToken(normalized);
  return {
    account,
    cookie: formatSessionCookieHeader(token),
    body: {
      ok: true as const,
      email: account.email,
      is_subscribed: account.is_subscribed,
      free_credits: account.free_credits,
      bonusGranted: Boolean(account.signup_bonus_granted && opts?.grantSignupBonus),
    },
  };
}

export function jsonWithSession(body: unknown, cookie: string) {
  const res = NextResponse.json(body);
  res.headers.append("Set-Cookie", cookie);
  return res;
}
