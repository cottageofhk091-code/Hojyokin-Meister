import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getAccountWithCredits } from "@/lib/profiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: unknown) {
  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return json({ user: null });
  }
  const account = await getAccountWithCredits(session.email);
  return json({
    user: {
      email: account.email,
      is_subscribed: account.is_subscribed,
      free_credits: account.free_credits,
    },
  });
}
