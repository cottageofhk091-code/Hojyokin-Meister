export const SUBSIDY_TYPES = [
  "小規模事業者持続化補助金",
  "IT導入補助金",
  "その他・わからない",
] as const;

export type SubsidyType = (typeof SUBSIDY_TYPES)[number];

export const INDUSTRY_OPTIONS = [
  "飲食店",
  "美容・サロン",
  "製造業",
  "IT・Webサービス",
  "小売",
  "建設業",
  "その他",
] as const;

export type IndustryOption = (typeof INDUSTRY_OPTIONS)[number];

export type SubsidyRecommendation = {
  name: string;
  category: string;
  summary: string;
  isMain: boolean;
};

export type ExpenseRow = {
  category: string;
  item: string;
  amount: string;
  eligibleAmount: string;
};

export type ApplicationPlan = {
  title: string;
  overview: string;
  strengths: string;
  issues: string;
  activities: string;
  differentiation: string;
  quantitativeEffects: string;
  qualitativeEffects: string;
  expenses: ExpenseRow[];
  totalAmount: string;
  totalEligible: string;
  subsidyAmount: string;
  subsidyRateNote: string;
};

export const GENERATE_MODES = ["free", "premium"] as const;

export type GenerateMode = (typeof GENERATE_MODES)[number];

export type AdoptionAdvice = {
  numbers: string[];
  documents: string[];
};

export type OverlapCheck = {
  risk: string;
  comments: string[];
};

export type GenerateResult = {
  recommendations: SubsidyRecommendation[];
  plan: ApplicationPlan;
  advice: AdoptionAdvice;
  overlapCheck?: OverlapCheck;
  mode?: GenerateMode;
};

export type SavedPlan = {
  id: string;
  savedAt: string;
  location: string;
  industry: string;
  subsidyType: string;
  title: string;
  expenseItems: string[];
  userMemo?: string;
  snapshot?: GenerateResult;
};

export function isGenerateMode(value: unknown): value is GenerateMode {
  return value === "free" || value === "premium";
}

export function isSubsidyType(value: unknown): value is SubsidyType {
  return (
    typeof value === "string" &&
    (SUBSIDY_TYPES as readonly string[]).includes(value)
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

function isExpenseRow(value: unknown): value is ExpenseRow {
  if (!value || typeof value !== "object") return false;
  const row = value as ExpenseRow;
  return (
    isNonEmptyString(row.category) &&
    isNonEmptyString(row.item) &&
    isNonEmptyString(row.amount) &&
    isNonEmptyString(row.eligibleAmount)
  );
}

export function isGenerateResult(value: unknown): value is GenerateResult {
  if (!value || typeof value !== "object") return false;
  const data = value as GenerateResult;
  const plan = data.plan;
  return (
    Array.isArray(data.recommendations) &&
    data.recommendations.length > 0 &&
    data.recommendations.every(
      (item) =>
        isNonEmptyString(item.name) &&
        isNonEmptyString(item.category) &&
        isNonEmptyString(item.summary) &&
        typeof item.isMain === "boolean",
    ) &&
    Boolean(plan) &&
    isNonEmptyString(plan.title) &&
    isNonEmptyString(plan.overview) &&
    isNonEmptyString(plan.strengths) &&
    isNonEmptyString(plan.issues) &&
    isNonEmptyString(plan.activities) &&
    isNonEmptyString(plan.differentiation) &&
    isNonEmptyString(plan.quantitativeEffects) &&
    isNonEmptyString(plan.qualitativeEffects) &&
    Array.isArray(plan.expenses) &&
    plan.expenses.length > 0 &&
    plan.expenses.every(isExpenseRow) &&
    isNonEmptyString(plan.totalAmount) &&
    isNonEmptyString(plan.totalEligible) &&
    isNonEmptyString(plan.subsidyAmount) &&
    isNonEmptyString(plan.subsidyRateNote) &&
    isStringArray(data.advice?.numbers) &&
    isStringArray(data.advice?.documents) &&
    (data.overlapCheck === undefined ||
      (Boolean(data.overlapCheck) &&
        isNonEmptyString(data.overlapCheck.risk) &&
        isStringArray(data.overlapCheck.comments)))
  );
}
