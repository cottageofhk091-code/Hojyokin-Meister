import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import {
  consumeFreeCredit,
  FREE_TRIAL_EXHAUSTED_MESSAGE,
  getCreditSnapshot,
} from "@/lib/profiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const session = await getSessionUser();
    if (!session?.email) {
      return NextResponse.json(
        { error: "ログインしてください。", code: "AUTH_REQUIRED" },
        { status: 401 },
      );
    }

    const record = await getCreditSnapshot(session.email);
    if (record.is_subscribed) {
      return NextResponse.json({
        unlocked: true,
        alreadyPro: true,
        usedTicket: false,
        free_credits: record.freeCredits,
        is_subscribed: true,
      });
    }

    const consumed = await consumeFreeCredit(session.email);
    if (consumed.consumed) {
      return NextResponse.json({
        unlocked: true,
        alreadyPro: false,
        usedTicket: true,
        free_credits: consumed.remaining,
        is_subscribed: consumed.is_subscribed,
      });
    }

    return NextResponse.json(
      {
        error: FREE_TRIAL_EXHAUSTED_MESSAGE,
        code: "PRO_TRIAL_EXHAUSTED",
        free_credits: consumed.remaining,
        is_subscribed: false,
      },
      { status: 402 },
    );
  } catch (err) {
    console.error("[unlock-pro]", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Pro機能の解除に失敗しました。",
        code: "UNLOCK_FAILED",
      },
      { status: 500 },
    );
  }
}
