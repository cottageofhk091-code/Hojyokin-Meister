import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { ensureAccount } from "@/lib/store/accounts";

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
  const account = await ensureAccount(session.email);
  return json({
    user: {
      email: account.email,
      is_subscribed: account.is_subscribed,
    },
  });
}
