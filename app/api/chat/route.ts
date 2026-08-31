import { NextResponse } from "next/server";
import {
  GeminiCallError,
  completeText,
  createGeminiClient,
} from "@/lib/gemini";

export const maxDuration = 30;

const SYSTEM = `あなたは「AI補助金マイスター」の個別相談係です。
ユーザーは申請の代行ではなく、自作のサポートを求めています。
官公署への提出代行、採択の保証、行政書士・中小企業診断士の独占業務に該当する助言はしないでください。
存在しない制度名・公募回・補助率を断定しないでください。不確かな自治体独自制度は「確認を推奨」と明記してください。
前提として渡された地域・業種・事業計画を踏まえ、質問の文脈に即した実用的なアドバイスを日本語で返してください。
回答は長文を避け、ユーザーの質問に対して1〜3文程度で簡潔かつ具体的に答えてください。結論を最初に述べ、テンポの良い会話を心がけてください。`;

type ChatTurn = { role: "user" | "assistant"; content: string };

function asTurns(value: unknown): ChatTurn[] {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap((item): ChatTurn[] => {
      if (!item || typeof item !== "object") return [];
      const role = (item as { role?: unknown }).role;
      const content = String((item as { content?: unknown }).content ?? "").trim();
      if (role !== "user" && role !== "assistant") return [];
      if (!content) return [];
      return [{ role, content: content.slice(0, 2000) }];
    })
    .slice(-10);
}

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

  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const message = String(record.message ?? "").trim();
  if (message.length < 2 || message.length > 800) {
    return NextResponse.json(
      { error: "質問を2文字以上、800文字以内で入力してください。" },
      { status: 400 },
    );
  }

  const context = record.context && typeof record.context === "object"
    ? (record.context as Record<string, unknown>)
    : {};
  const location = String(context.location ?? "").trim();
  const industry = String(context.industry ?? "").trim();
  const subsidyType = String(context.subsidyType ?? "").trim();
  const plan = context.plan;
  const turns = asTurns(record.history);

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY が取得できません。" },
      { status: 500 },
    );
  }

  const conversation = [
    ...turns.map((turn) => `${turn.role === "user" ? "ユーザー" : "マイスター"}: ${turn.content}`),
    `ユーザー: ${message}`,
  ].join("\n\n");

  const userPrompt = `【前提知識】
対象地域: ${location || "未入力"}
業種: ${industry || "未入力"}
希望の補助金: ${subsidyType || "未入力"}
事業計画（抜粋）:
${JSON.stringify(plan ?? {}, null, 2).slice(0, 4500)}

【会話】
${conversation}

上記の地域・業種・事業計画を前提に、最新の質問へ1〜3文で答えてください。結論を先に述べてください。`;

  try {
    const reply = await completeText(
      createGeminiClient(apiKey),
      SYSTEM,
      userPrompt,
      "個別AIチャット相談",
    );
    return NextResponse.json({ reply });
  } catch (error) {
    if (error instanceof GeminiCallError) {
      return NextResponse.json(
        { error: error.message, detail: error.detail },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: "相談の応答に失敗しました。" },
      { status: 502 },
    );
  }
}
