import type { GenerateResult } from "@/lib/types";

export function formatApplicationDocument(result: GenerateResult) {
  const main = result.recommendations.find((item) => item.isMain);
  const combined = result.recommendations
    .filter((item) => !item.isMain)
    .map((item) => item.name);

  const expenseRows = [
    ...result.plan.expenses.map(
      (row) =>
        `| ${row.category} | ${row.item} | ${row.amount} | ${row.eligibleAmount} |`,
    ),
    `| **合計** | | **${result.plan.totalAmount}** | **${result.plan.totalEligible}** |`,
    `| **補助金申請額（${result.plan.subsidyRateNote}）** | | | **${result.plan.subsidyAmount}** |`,
  ].join("\n");

  const overlap =
    result.overlapCheck && result.overlapCheck.comments.length > 0
      ? `
■ 重複申請チェック
- リスク目安: ${result.overlapCheck.risk}
${result.overlapCheck.comments.map((item) => `- ${item}`).join("\n")}
`
      : "";

  return `■ おすすめ補助金・助成金マップ（併用提案）
- メイン候補: 【${main?.name ?? "未設定"}】
- 併用検討: 【${combined.join(" / ") || "IT導入補助金 / 業務改善助成金 / 自治体独自補助金"}】

${result.recommendations
  .map((item) => `- ${item.isMain ? "メイン" : item.category}: ${item.name} … ${item.summary}`)
  .join("\n")}

■ 事業計画書（申請書）下書き案
1. 補助事業名（全体のタイトル）
   ${result.plan.title}

2. 自社の事業概要、強み、および現在の課題
   ・自社概要と独自の強み：
   ${result.plan.overview}
   ${result.plan.strengths}
   ・現在抱えている課題：
   ${result.plan.issues}

3. 今回取り組む事業内容（補助金の使い道）
   ・具体的な取組内容と購入・導入物：
   ${result.plan.activities}
   ・他社との差別化ポイント：
   ${result.plan.differentiation}

4. 補助事業の効果（売上・成果予測）
   ・定量的効果（数値目標）：
   ${result.plan.quantitativeEffects}
   ・定性的効果（業務改善・顧客満足度など）：
   ${result.plan.qualitativeEffects}

5. 経費内訳および補助金申請額（テーブル形式）
| 経費区分 | 内容・品名 | 金額（税込） | 補助対象経費 |
| --- | --- | --- | --- |
${expenseRows}

■ 採択率を上げるための追加アドバイス＆必要書類リスト
- 追記すべき具体的な数値データ
${result.advice.numbers.map((item) => `  ・${item}`).join("\n")}
- 準備すべき添付書類
${result.advice.documents.map((item) => `  ・${item}`).join("\n")}
${overlap}`;
}

export function formatPlanOverviewMarkdown(result: GenerateResult) {
  return `## 1. 補助事業名（全体のタイトル）

${result.plan.title}

## 2. 自社の事業概要、強み、および現在の課題

### 自社概要と独自の強み
${result.plan.overview}

${result.plan.strengths}

### 現在抱えている課題
${result.plan.issues}
`;
}

export function formatPlanDetailsMarkdown(result: GenerateResult) {
  return `## 3. 今回取り組む事業内容（補助金の使い道）

### 具体的な取組内容と購入・導入物
${result.plan.activities}

### 他社との差別化ポイント
${result.plan.differentiation}

## 4. 補助事業の効果（売上・成果予測）

### 定量的効果（数値目標）
${result.plan.quantitativeEffects}

### 定性的効果（業務改善・顧客満足度など）
${result.plan.qualitativeEffects}
`;
}

export function formatExpenseMarkdown(result: GenerateResult) {
  const expenseRows = [
    ...result.plan.expenses.map(
      (row) =>
        `| ${row.category} | ${row.item} | ${row.amount} | ${row.eligibleAmount} |`,
    ),
    `| **合計** | | **${result.plan.totalAmount}** | **${result.plan.totalEligible}** |`,
    `| **補助金申請額（${result.plan.subsidyRateNote}）** | | | **${result.plan.subsidyAmount}** |`,
  ].join("\n");

  return `## 5. 経費内訳および補助金申請額

| 経費区分 | 内容・品名 | 金額（税込） | 補助対象経費 |
| --- | --- | --- | --- |
${expenseRows}
`;
}

export function formatPlanMarkdown(result: GenerateResult) {
  return `${formatPlanOverviewMarkdown(result)}
${formatPlanDetailsMarkdown(result)}
${formatExpenseMarkdown(result)}`;
}
