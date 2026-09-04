import { LIMIT_MESSAGE } from "@/lib/proposals-limits";
import type { SavedPlan } from "@/lib/types";

export { LIMIT_MESSAGE, MAX_PROPOSALS } from "@/lib/proposals-limits";

export type SaveProposalResult =
  | { ok: true; plan: SavedPlan; proposals: SavedPlan[]; replacedId?: string }
  | { ok: false; limitReached: true; error: string; oldest: SavedPlan | null }
  | { ok: false; error: string };

async function parseJson(response: Response) {
  return (await response.json()) as {
    error?: string;
    proposals?: SavedPlan[];
    plan?: SavedPlan;
    replacedId?: string;
    oldest?: SavedPlan | null;
    is_subscribed?: boolean;
    remaining?: number;
  };
}

export async function fetchProposals() {
  const response = await fetch("/api/proposals", { cache: "no-store" });
  const data = await parseJson(response);
  if (!response.ok) {
    throw new Error(data.error || "保存データを取得できませんでした。");
  }
  return {
    proposals: data.proposals ?? [],
    is_subscribed: Boolean(data.is_subscribed),
    remaining: data.remaining ?? 0,
  };
}

export async function fetchProposal(id: string) {
  const response = await fetch(`/api/proposals/${id}`, { cache: "no-store" });
  const data = await parseJson(response);
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(data.error || "骨子を取得できませんでした。");
  }
  return data.plan ?? null;
}

export async function saveProposalToAccount(
  plan: SavedPlan,
  replaceOldest = false,
): Promise<SaveProposalResult> {
  const response = await fetch("/api/proposals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan, replaceOldest }),
  });
  const data = await parseJson(response);
  if (response.status === 409) {
    return {
      ok: false,
      limitReached: true,
      error: data.error || LIMIT_MESSAGE,
      oldest: data.oldest ?? null,
    };
  }
  if (!response.ok || !data.plan) {
    return { ok: false, error: data.error || "保存に失敗しました。" };
  }
  return {
    ok: true,
    plan: data.plan,
    proposals: data.proposals ?? [],
    replacedId: data.replacedId,
  };
}

export async function deleteProposalFromAccount(id: string) {
  const response = await fetch(`/api/proposals/${id}`, { method: "DELETE" });
  const data = await parseJson(response);
  if (!response.ok) {
    throw new Error(data.error || "削除に失敗しました。");
  }
  return data.proposals ?? [];
}
