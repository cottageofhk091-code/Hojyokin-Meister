import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { ensureAccount } from "@/lib/store/accounts";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ user: null });
  }
  const account = await ensureAccount(session.email);
  return NextResponse.json({
    user: {
      email: account.email,
      is_subscribed: account.is_subscribed,
    },
  });
}
