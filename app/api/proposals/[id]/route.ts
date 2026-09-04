import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { deleteProposal, getProposal } from "@/lib/store/accounts";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const { id } = await context.params;
  const plan = await getProposal(user.email, id);
  if (!plan) {
    return NextResponse.json({ error: "骨子が見つかりません。" }, { status: 404 });
  }
  return NextResponse.json({ plan });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await getProposal(user.email, id);
  if (!existing) {
    return NextResponse.json({ error: "骨子が見つかりません。" }, { status: 404 });
  }
  const proposals = await deleteProposal(user.email, id);
  return NextResponse.json({ ok: true, proposals });
}
