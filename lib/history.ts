import type { ExpenseRow, GenerateResult, SavedPlan } from "@/lib/types";

const STORAGE_KEY = "ai-hojokin-meister-history";

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[円,，、・]/g, "");
}

export function loadSavedPlans(): SavedPlan[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSavedPlan);
  } catch {
    return [];
  }
}

export function savePlanToHistory(plan: SavedPlan) {
  const current = loadSavedPlans().filter((item) => item.id !== plan.id);
  const next = [plan, ...current].slice(0, 5);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function deleteSavedPlan(id: string) {
  const next = loadSavedPlans().filter((item) => item.id !== id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function resultToSavedPlan(
  result: GenerateResult,
  context: {
    location: string;
    industry: string;
    subsidyType: string;
    userMemo?: string;
  },
): SavedPlan {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `plan-${Date.now()}`,
    savedAt: new Date().toISOString(),
    location: context.location,
    industry: context.industry,
    subsidyType: context.subsidyType,
    title: result.plan.title,
    expenseItems: result.plan.expenses.map((row) => row.item),
    userMemo: context.userMemo,
    snapshot: result,
  };
}

export type ExpenseOverlapHit = {
  currentItem: string;
  matchedItem: string;
  historyTitle: string;
  subsidyType: string;
  savedAt: string;
  planId?: string;
};

export function findExpenseOverlaps(
  expenses: ExpenseRow[],
  history: SavedPlan[],
  excludeId?: string,
): ExpenseOverlapHit[] {
  const hits: ExpenseOverlapHit[] = [];
  for (const row of expenses) {
    const current = normalize(row.item);
    if (current.length < 2) continue;
    for (const plan of history) {
      if (excludeId && plan.id === excludeId) continue;
      for (const item of plan.expenseItems) {
        const saved = normalize(item);
        if (saved.length < 2) continue;
        if (current.includes(saved) || saved.includes(current)) {
          hits.push({
            currentItem: row.item,
            matchedItem: item,
            historyTitle: plan.title,
            subsidyType: plan.subsidyType,
            savedAt: plan.savedAt,
            planId: plan.id,
          });
        }
      }
    }
  }
  return uniqueHits(hits);
}

export function findOverlapsForPlan(
  plan: SavedPlan,
  history: SavedPlan[],
): ExpenseOverlapHit[] {
  const expenses: ExpenseRow[] =
    plan.snapshot?.plan.expenses ??
    plan.expenseItems.map((item) => ({
      category: "経費",
      item,
      amount: "-",
      eligibleAmount: "-",
    }));
  return findExpenseOverlaps(expenses, history, plan.id);
}

export type DashboardAlert = {
  planId: string;
  title: string;
  subsidyType: string;
  count: number;
};

export function collectDashboardAlerts(plans: SavedPlan[]): DashboardAlert[] {
  return plans
    .map((plan) => {
      const hits = findOverlapsForPlan(plan, plans);
      return {
        planId: plan.id,
        title: plan.title,
        subsidyType: plan.subsidyType,
        count: hits.length,
      };
    })
    .filter((item) => item.count > 0);
}

function uniqueHits(hits: ExpenseOverlapHit[]) {
  const seen = new Set<string>();
  return hits.filter((hit) => {
    const key = `${hit.currentItem}|${hit.historyTitle}|${hit.subsidyType}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function isSavedPlan(value: unknown): value is SavedPlan {
  if (!value || typeof value !== "object") return false;
  const plan = value as SavedPlan;
  return (
    typeof plan.id === "string" &&
    typeof plan.savedAt === "string" &&
    typeof plan.title === "string" &&
    typeof plan.subsidyType === "string" &&
    Array.isArray(plan.expenseItems)
  );
}
