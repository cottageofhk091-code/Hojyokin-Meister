import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { isSavedPlan } from "@/lib/history";
import {
  LIMIT_MESSAGE,
  LimitReachedError,
  MAX_PROPOSALS,
  ensureAccount,
  listProposals,
  saveProposal,
} from "@/lib/store/accounts";
import type { SavedPlan } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const account = await ensureAccount(user.email);
  const proposals = await listProposals(user.email);
  return NextResponse.json({
    proposals,
    is_subscribed: account.is_subscribed,
    remaining: Math.max(0, MAX_PROPOSALS - proposals.length),
  });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が正しくありません。" },
      { status: 400 },
    );
  }

  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const plan = record.plan;
  const replaceOldest = Boolean(record.replaceOldest);

  if (!isSavedPlan(plan)) {
    return NextResponse.json(
      { error: "保存データの形式が正しくありません。" },
      { status: 400 },
    );
  }

  try {
    await ensureAccount(user.email);
    const saved = await saveProposal(user.email, plan as SavedPlan, { replaceOldest });
    return NextResponse.json({
      ok: true,
      plan: saved.plan,
      proposals: saved.proposals,
      replacedId: saved.replacedId,
      remaining: Math.max(0, MAX_PROPOSALS - saved.proposals.length),
    });
  } catch (error) {
    if (error instanceof LimitReachedError) {
      return NextResponse.json(
        { error: LIMIT_MESSAGE, oldest: error.oldest },
        { status: 409 },
      );
    }
    const message =
      error instanceof Error && error.message.trim()
        ? error.message
        : "保存に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
