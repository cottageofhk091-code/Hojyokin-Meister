import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { ensureAccount, setSubscribed } from "@/lib/store/accounts";

export const runtime = "nodejs";

export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ ok: true, localOnly: true });
  }

  const current = await ensureAccount(session.email);
  const account = await setSubscribed(session.email, !current.is_subscribed);
  return NextResponse.json({
    ok: true,
    is_subscribed: Boolean(account?.is_subscribed),
  });
}
