import type { GenerateResult } from "@/lib/types";

function clip(text: string, max = 90) {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).replace(/[、。]$/, "")}…`;
}

export function toSummaryResult(result: GenerateResult): GenerateResult {
  return {
    ...result,
    recommendations: result.recommendations.slice(0, 3).map((item) => ({
      ...item,
      summary: clip(item.summary, 70),
    })),
    plan: {
      ...result.plan,
      overview: clip(result.plan.overview, 90),
      strengths: clip(result.plan.strengths, 90),
      issues: clip(result.plan.issues, 90),
      activities: clip(result.plan.activities, 110),
      differentiation: clip(result.plan.differentiation, 90),
      quantitativeEffects: clip(result.plan.quantitativeEffects, 90),
      qualitativeEffects: clip(result.plan.qualitativeEffects, 90),
      expenses: result.plan.expenses.slice(0, 2),
    },
    advice: {
      numbers: result.advice.numbers.slice(0, 2).map((item) => clip(item, 70)),
      documents: result.advice.documents.slice(0, 2),
    },
    overlapCheck: undefined,
    mode: "free",
  };
}
