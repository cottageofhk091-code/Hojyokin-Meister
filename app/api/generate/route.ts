import { NextResponse } from "next/server";
import { sendGA4Event } from "@/lib/ga4-mp";
import { supabase } from "@/lib/supabase";
import {
  GeminiCallError,
  completeJson,
  createGeminiClient,
} from "@/lib/gemini";
import {
  isGenerateMode,
  isGenerateResult,
  isSubsidyType,
  type AdoptionAdvice,
  type ApplicationPlan,
  type ExpenseRow,
  type GenerateMode,
  type GenerateResult,
  type OverlapCheck,
  type SubsidyRecommendation,
  type SubsidyType,
} from "@/lib/types";

export const maxDuration = 60;

const MIN_MEMO_LENGTH = 20;
const MIN_INDUSTRY_LENGTH = 2;
const MIN_LOCATION_LENGTH = 2;

const SHARED_CONSTRAINTS = `ユーザーは「申請の代行」ではなく「自作のサポート」を求めています。
官公署への提出代行、採択の保証、行政書士・中小企業診断士の独占業務に該当する助言はしないでください。
客観的かつ論理的な文章構成・下書き・確認ポイントのみを提供してください。
存在しない制度名・公募回・補助率を断定しないでください。不確かな自治体独自制度は「確認を推奨」と明記してください。
専門用語はわかりやすく整理し、数字は穴埋めしやすい形で提案してください。`;

function buildUserContext(input: {
  location: string;
  industry: string;
  subsidyType: SubsidyType;
  userMemo: string;
}) {
  return `対象地域: ${input.location}
業種: ${input.industry}
希望の補助金: ${input.subsidyType}
事業メモ・やりたいこと: ${input.userMemo}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseRecommendations(value: unknown): SubsidyRecommendation[] | null {
  const data = asRecord(value);
  if (!data) return null;

  const mainName = asString(data.mainName) || asString(asRecord(data.main)?.name);
  const mainSummary =
    asString(data.mainSummary) ||
    asString(asRecord(data.main)?.reason) ||
    asString(asRecord(data.main)?.summary);

  const rawItems = Array.isArray(data.recommendations)
    ? data.recommendations
    : Array.isArray(data.items)
      ? data.items
      : [];

  const items: SubsidyRecommendation[] = rawItems.flatMap((item) => {
    const record = asRecord(item);
    if (!record) return [];
    const name = asString(record.name);
    const category = asString(record.category);
    const summary =
      asString(record.summary) ||
      asString(record.possibility) ||
      asString(record.advice);
    if (!name || !category || !summary) return [];
    return [
      {
        name,
        category,
        summary,
        isMain: Boolean(record.isMain),
      },
    ];
  });

  if (mainName && mainSummary) {
    const alreadyMain = items.some(
      (item) => item.name === mainName || item.isMain,
    );
    if (!alreadyMain) {
      items.unshift({
        name: mainName,
        category: "メイン候補",
        summary: mainSummary,
        isMain: true,
      });
    } else {
      items.forEach((item) => {
        if (item.name === mainName) item.isMain = true;
      });
    }
  }

  if (!items.some((item) => item.isMain) && items[0]) {
    items[0].isMain = true;
  }

  return items.length > 0 ? items.slice(0, 4) : null;
}

function parsePlan(value: unknown): ApplicationPlan | null {
  const data = asRecord(value);
  const plan = asRecord(data?.plan) ?? data;
  if (!plan) return null;

  const expenses: ExpenseRow[] = Array.isArray(plan.expenses)
    ? plan.expenses.flatMap((item) => {
        const row = asRecord(item);
        if (!row) return [];
        const category = asString(row.category);
        const name = asString(row.item) || asString(row.name);
        const amount = asString(row.amount);
        const eligibleAmount =
          asString(row.eligibleAmount) || asString(row.eligible) || amount;
        if (!category || !name || !amount) return [];
        return [{ category, item: name, amount, eligibleAmount }];
      })
    : [];

  const parsed: ApplicationPlan = {
    title: asString(plan.title) || asString(plan.projectName),
    overview: asString(plan.overview) || asString(plan.companyOverview),
    strengths: asString(plan.strengths),
    issues: asString(plan.issues) || asString(plan.challenges),
    activities: asString(plan.activities) || asString(plan.project),
    differentiation:
      asString(plan.differentiation) || asString(plan.advantage),
    quantitativeEffects:
      asString(plan.quantitativeEffects) || asString(plan.quantitative),
    qualitativeEffects:
      asString(plan.qualitativeEffects) || asString(plan.qualitative),
    expenses,
    totalAmount: asString(plan.totalAmount),
    totalEligible: asString(plan.totalEligible) || asString(plan.totalAmount),
    subsidyAmount: asString(plan.subsidyAmount),
    subsidyRateNote:
      asString(plan.subsidyRateNote) || "補助率 2/3 換算",
  };

  if (
    !parsed.title ||
    !parsed.overview ||
    !parsed.strengths ||
    !parsed.issues ||
    !parsed.activities ||
    !parsed.differentiation ||
    !parsed.quantitativeEffects ||
    !parsed.qualitativeEffects ||
    parsed.expenses.length === 0 ||
    !parsed.totalAmount ||
    !parsed.subsidyAmount
  ) {
    return null;
  }

  return parsed;
}

function parseAdvice(value: unknown): AdoptionAdvice | null {
  const data = asRecord(value);
  if (!data) return null;
  const numbers = Array.isArray(data.numbers)
    ? data.numbers.map(asString).filter(Boolean)
    : [];
  const documents = Array.isArray(data.documents)
    ? data.documents.map(asString).filter(Boolean)
    : [];
  if (numbers.length === 0 || documents.length === 0) return null;
  return { numbers, documents };
}

function parseOverlapCheck(value: unknown): OverlapCheck | null {
  const data = asRecord(value);
  if (!data) return null;
  const nested = asRecord(data.overlapCheck) ?? data;
  const risk = asString(nested.risk);
  const comments = Array.isArray(nested.comments)
    ? nested.comments.map(asString).filter(Boolean)
    : [];
  if (!risk || comments.length === 0) return null;
  return { risk, comments };
}

const FALLBACK_OVERLAP: OverlapCheck = {
  risk: "要確認",
  comments: [
    "同じ経費・物品を複数の補助金の補助対象に計上すると、重複受給とみなされるリスクがあります。",
    "IT導入補助金と持続化補助金などで、同一のシステム・設備費を両方に入れていないか確認してください。",
    "マイ履歴に保存した過去の計画と品目が重なっていないかを、申請前に必ず照合してください。",
  ],
};

const RESEARCHER_SYSTEM = `# Role
あなたは「補助金リサーチ・提案係」です。中小企業・個人事業主向けの補助金・助成金の制度設計に精通しています。

${SHARED_CONSTRAINTS}

# Task
ユーザーの地域・業種・事業メモから、メインの補助金に加えて併用・活用できる取りこぼし防止のおすすめ制度を抽出してください。
希望が「その他・わからない」の場合は、メモ内容から最も適したメイン候補を1つ選んでください。

必ず含める観点:
- メイン候補（今回の骨子対象）
- IT・システム化（IT導入補助金。POS、会計、EC、予約システム等）
- 賃上げ・設備投資（業務改善助成金）
- 地域・自治体独自支援（商工会・商工会議所、産業振興課での確認を促す）

# Output JSON
{
  "mainName": "制度名",
  "mainSummary": "今回の骨子対象にする理由（2〜3文）",
  "recommendations": [
    {
      "name": "制度名",
      "category": "IT・システム化 | 賃上げ・設備投資 | 地域・自治体独自",
      "summary": "適用可能性のワンポイント",
      "isMain": false
    }
  ]
}
recommendations はメイン以外を最大3件。JSON以外は出力しない。`;

const WRITER_SYSTEM_BASE = `# Role
あなたは「申請書ライター係」です。小規模事業者持続化補助金などの実際の事業計画書（申請書）様式に沿って、審査員に評価されやすい下書きを作成します。

${SHARED_CONSTRAINTS}

# Task
ユーザー入力とリサーチ結果をもとに、提出用の事業計画書下書きを作成してください。
地域特有の強み・課題解決・地域貢献性を自然に織り込んでください。
金額が不明な場合は仮置きと明記し、穴埋めしやすい数字にしてください。
持続化補助金を想定する場合、補助率は原則 2/3 として補助金申請額を概算してください。`;

function writerSystem(mode: GenerateMode) {
  const lengthGuide =
    mode === "free"
      ? `要約版です。各項目は2〜3文に抑えてください。経費テーブルは代表的な1〜2行のみとし、詳細な品目分解はしないでください。`
      : `フルバージョンです。各項目は審査員が読める具体性で書いてください。経費テーブルは3〜5行の詳細（品名・内容、税込金額、補助対象額）とし、数量や単価が分かる表現を含めてください。`;

  return `${WRITER_SYSTEM_BASE}

${lengthGuide}

# Output JSON
{
  "plan": {
    "title": "補助事業名。例：予約システムの導入による機会損失の削減および新規顧客開拓計画",
    "overview": "自社の事業概要（地域・業種・顧客層）",
    "strengths": "独自の強み・地域での役割",
    "issues": "現在抱えている課題",
    "activities": "具体的な取組内容と購入・導入物、活用方法、スケジュール感",
    "differentiation": "他社との差別化ポイント",
    "quantitativeEffects": "売上・客数・工数などの数値目標（仮置き可）",
    "qualitativeEffects": "業務改善・顧客満足・地域活性化などの定性効果",
    "expenses": [
      {
        "category": "機械装置等費",
        "item": "品名・内容",
        "amount": "330,000円",
        "eligibleAmount": "330,000円"
      }
    ],
    "totalAmount": "合計税込金額",
    "totalEligible": "補助対象経費合計",
    "subsidyAmount": "補助金申請額",
    "subsidyRateNote": "補助率 2/3 換算"
  }
}
JSON以外は出力しない。`;
}

const REVIEWER_SYSTEM_FREE = `# Role
あなたは「審査員目線チェック係」です。出来上がった事業計画書下書きを、採択率を上げる視点で点検します。

${SHARED_CONSTRAINTS}

# Task
下書きの穴を指摘し、ユーザーが自分で追記できる具体的な項目を提案してください。要約版なので numbers / documents は各2〜3件に抑えてください。
断定的な採択保証はしないでください。

# Output JSON
{
  "numbers": ["追記すべき数値データの提案"],
  "documents": ["準備すべき添付書類"]
}
JSON以外は出力しない。`;

const REVIEWER_SYSTEM_PREMIUM = `# Role
あなたは「審査員目線チェック係」です。出来上がった事業計画書下書きを、採択率を上げる視点で点検します。重複申請・重複受給のリスクにも注意します。

${SHARED_CONSTRAINTS}

# Task
下書きの穴（定量データ不足、根拠資料不足、地域性の弱さ、経費の妥当性）を指摘し、ユーザーが自分で追記できる具体的な項目を提案してください。
同じ経費・物品を複数の補助金へ計上していないか、マイ履歴の過去計画と照らした確認コメントも出してください。
断定的な採択保証はしないでください。
添付書類は見積書、店舗写真、決算書、確定申告書、履歴事項全部証明書、導入システムの画面イメージなどを具体的に挙げてください。

# Output JSON
{
  "numbers": ["追記すべき数値データの提案（客単価、既存顧客数、目標件数など）"],
  "documents": ["準備すべき添付書類（見積書、店舗写真、決算書等）"],
  "overlapCheck": {
    "risk": "低 | 要確認 | 注意",
    "comments": [
      "同じ経費・物品で他の補助金を申請していないかの確認コメント"
    ]
  }
}
numbers と documents はそれぞれ3〜5件。overlapCheck.comments は2〜4件。JSON以外は出力しない。`;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が正しくありません。" },
      { status: 400 },
    );
  }

  const location =
    body && typeof body === "object" && "location" in body
      ? String((body as { location: unknown }).location ?? "").trim()
      : "";
  const industry =
    body && typeof body === "object" && "industry" in body
      ? String((body as { industry: unknown }).industry ?? "").trim()
      : "";
  const subsidyType =
    body && typeof body === "object" && "subsidyType" in body
      ? (body as { subsidyType: unknown }).subsidyType
      : null;
  const userMemo =
    body && typeof body === "object" && "userMemo" in body
      ? String((body as { userMemo: unknown }).userMemo ?? "").trim()
      : "";
  const mode: GenerateMode =
    body && typeof body === "object" && "mode" in body && isGenerateMode((body as { mode: unknown }).mode)
      ? (body as { mode: GenerateMode }).mode
      : "free";
  const savedPlans =
    body && typeof body === "object" && "savedPlans" in body && Array.isArray((body as { savedPlans: unknown }).savedPlans)
      ? (body as { savedPlans: Array<{ title?: unknown; subsidyType?: unknown; expenseItems?: unknown }> }).savedPlans
          .slice(0, 10)
          .map((item) => ({
            title: String(item?.title ?? ""),
            subsidyType: String(item?.subsidyType ?? ""),
            expenseItems: Array.isArray(item?.expenseItems)
              ? item.expenseItems.map((value) => String(value)).filter(Boolean)
              : [],
          }))
      : [];

  if (!isSubsidyType(subsidyType)) {
    return NextResponse.json(
      { error: "申請したい補助金を選択してください。" },
      { status: 400 },
    );
  }
  if (location.length < MIN_LOCATION_LENGTH) {
    return NextResponse.json(
      { error: "対象地域を入力してください。例：三重県朝日町" },
      { status: 400 },
    );
  }
  if (industry.length < MIN_INDUSTRY_LENGTH) {
    return NextResponse.json(
      { error: "業種を入力してください。" },
      { status: 400 },
    );
  }
  if (userMemo.length < MIN_MEMO_LENGTH) {
    return NextResponse.json(
      {
        error:
          "事業メモをもう少し詳しく書いてください。課題・強み・導入したい内容があると精度が上がります。",
      },
      { status: 400 },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    const message =
      "GEMINI_API_KEY が取得できません。.env.local に GEMINI_API_KEY を記載し、開発サーバーを再起動してください。";
    console.error("[Gemini]", message);
    return NextResponse.json(
      {
        error: message,
        step: "初期化",
        detail: "process.env.GEMINI_API_KEY が空です。",
      },
      { status: 500 },
    );
  }

  const input = { location, industry, subsidyType, userMemo };
  const userContext = buildUserContext(input);
  const ai = createGeminiClient(apiKey);

  try {
    const researchRaw = await completeJson(
      ai,
      RESEARCHER_SYSTEM,
      `Step 1【補助金リサーチ・提案係】として、次の条件から取りこぼし防止の制度マップを作ってください。\n\n${userContext}`,
      "Step 1: 補助金リサーチ・提案",
    );
    const recommendations = parseRecommendations(researchRaw);
    if (!recommendations) {
      throw new GeminiCallError({
        step: "Step 1: 補助金リサーチ・提案",
        message: "Step 1 の結果形式が不正です。補助金リストを組み立てられませんでした。",
        detail: "recommendations の必須フィールドが不足しています。",
      });
    }

    const writerRaw = await completeJson(
      ai,
      writerSystem(mode),
      `Step 2【申請書ライター係】として、実際の事業計画書（申請書）様式に沿った下書きを作成してください。
モード: ${mode === "premium" ? "プレミアム（フルバージョン）" : "無料お試し（要約版）"}

${userContext}

【Step 1 リサーチ結果】
${JSON.stringify(recommendations, null, 2)}`,
      "Step 2: 申請書骨子作成",
    );
    const plan = parsePlan(writerRaw);
    if (!plan) {
      throw new GeminiCallError({
        step: "Step 2: 申請書骨子作成",
        message: "Step 2 の結果形式が不正です。事業計画書を組み立てられませんでした。",
        detail: "plan の必須フィールドまたは経費テーブルが不足しています。",
      });
    }

    const reviewerRaw = await completeJson(
      ai,
      mode === "premium" ? REVIEWER_SYSTEM_PREMIUM : REVIEWER_SYSTEM_FREE,
      `Step 3【審査員目線チェック係】として、採択率を上げる追記ポイントと必要書類を提案してください。
モード: ${mode === "premium" ? "プレミアム（重複申請チェックあり）" : "無料お試し"}

${userContext}

【Step 1 リサーチ結果】
${JSON.stringify(recommendations, null, 2)}

【Step 2 事業計画書下書き】
${JSON.stringify(plan, null, 2)}
${
  mode === "premium" && savedPlans.length > 0
    ? `

【マイ履歴（過去の申請計画）】
${JSON.stringify(savedPlans, null, 2)}`
    : ""
}`,
      "Step 3: チェック＆アドバイス",
    );
    const advice = parseAdvice(reviewerRaw);
    if (!advice) {
      throw new GeminiCallError({
        step: "Step 3: チェック＆アドバイス",
        message: "Step 3 の結果形式が不正です。アドバイスを組み立てられませんでした。",
        detail: "numbers / documents が空、または形式が不正です。",
      });
    }

    const result: GenerateResult = {
      recommendations,
      plan,
      advice,
      mode,
      overlapCheck:
        mode === "premium"
          ? parseOverlapCheck(reviewerRaw) ?? FALLBACK_OVERLAP
          : undefined,
    };

    if (!isGenerateResult(result)) {
      throw new GeminiCallError({
        step: "統合",
        message: "生成結果の最終チェックに失敗しました。",
        detail: "統合後のスキーマがフロントエンドの型と一致しません。",
      });
    }

    try {
      await sendGA4Event("subsidy_analyzed", {
        event_category: "subsidy",
      });
    } catch (gaError) {
      console.error("GA4 send error:", gaError);
    }

    supabase.from("app_logs").insert([
      {
        app_name: "subsidy",
        user_type: "unregistered",
        action_type: "search_subsidy",
      },
    ]).then(({ error }) => {
      if (error) console.error("Supabase log error:", error);
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof GeminiCallError) {
      console.error("[Gemini]", {
        step: error.step,
        model: error.model ?? null,
        status: error.status,
        message: error.message,
        detail: error.detail,
      });
      return NextResponse.json(
        {
          error: error.message,
          step: error.step,
          detail: error.detail,
          model: error.model,
        },
        { status: error.status },
      );
    }

    const fallback =
      error instanceof Error ? error.message : "不明なエラーが発生しました。";
    console.error("[Gemini] unexpected error:", error);
    return NextResponse.json(
      {
        error: "下書きの生成に失敗しました。",
        step: "不明",
        detail: fallback,
      },
      { status: 502 },
    );
  }
}
