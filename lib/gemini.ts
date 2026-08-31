import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_MODEL = "gemini-3.6-flash";

export class GeminiCallError extends Error {
  readonly status: number;
  readonly step: string;
  readonly detail: string;
  readonly model?: string;

  constructor(options: {
    message: string;
    status?: number;
    step: string;
    detail?: string;
    model?: string;
  }) {
    super(options.message);
    this.name = "GeminiCallError";
    this.status = options.status ?? 502;
    this.step = options.step;
    this.detail = options.detail ?? options.message;
    this.model = options.model;
  }
}

export function createGeminiClient(apiKey: string) {
  return new GoogleGenerativeAI(apiKey);
}

export function sanitizeGeminiText(value: string) {
  return value
    .replace(/AIza[0-9A-Za-z_-]+/g, "[REDACTED]")
    .replace(/AQ\.[0-9A-Za-z_-]+/g, "[REDACTED]")
    .replace(/GEMINI_API_KEY=\S+/g, "GEMINI_API_KEY=[REDACTED]")
    .slice(0, 500);
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(raw);
}

function readErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const record = error as Record<string, unknown>;
  if (typeof record.status === "number") return record.status;
  if (typeof record.code === "number") return record.code;
  const nested = record.error;
  if (nested && typeof nested === "object" && "code" in nested) {
    const code = (nested as { code?: unknown }).code;
    if (typeof code === "number") return code;
  }
  return undefined;
}

function readErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "不明なエラー";
  }
}

export async function completeText(
  genAI: GoogleGenerativeAI,
  system: string,
  user: string,
  step: string,
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: system,
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 2048,
      },
    });

    const result = await model.generateContent(user);
    const text = result.response.text()?.trim();
    if (!text) {
      throw new GeminiCallError({
        step,
        model: GEMINI_MODEL,
        status: 502,
        message: `${step} で Gemini から空の応答が返りました（モデル: ${GEMINI_MODEL}）。`,
        detail: "response.text が空です。",
      });
    }
    return text;
  } catch (error) {
    if (error instanceof GeminiCallError) {
      throw error;
    }

    const detail = sanitizeGeminiText(readErrorMessage(error));
    const status = readErrorStatus(error);
    throw new GeminiCallError({
      step,
      model: GEMINI_MODEL,
      status: status && status >= 400 && status < 600 ? status : 502,
      message: `${step} で Gemini API エラーが発生しました（モデル: ${GEMINI_MODEL}）。`,
      detail,
    });
  }
}

export async function completeJson(
  genAI: GoogleGenerativeAI,
  system: string,
  user: string,
  step: string,
): Promise<unknown> {
  try {
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: system,
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
      },
    });

    const result = await model.generateContent(user);
    const text = result.response.text()?.trim();
    if (!text) {
      throw new GeminiCallError({
        step,
        model: GEMINI_MODEL,
        status: 502,
        message: `${step} で Gemini から空の応答が返りました（モデル: ${GEMINI_MODEL}）。`,
        detail:
          "response.text が空です。セーフティフィルタや出力上限の可能性があります。",
      });
    }

    try {
      return extractJson(text);
    } catch (parseError) {
      throw new GeminiCallError({
        step,
        model: GEMINI_MODEL,
        status: 502,
        message: `${step} のJSON解析に失敗しました（モデル: ${GEMINI_MODEL}）。`,
        detail: sanitizeGeminiText(
          `${readErrorMessage(parseError)} / 応答先頭: ${text}`,
        ),
      });
    }
  } catch (error) {
    if (error instanceof GeminiCallError) {
      console.error("[Gemini]", {
        step: error.step,
        model: error.model ?? GEMINI_MODEL,
        status: error.status,
        detail: error.detail,
      });
      throw error;
    }

    const detail = sanitizeGeminiText(readErrorMessage(error));
    const status = readErrorStatus(error);
    console.error("[Gemini]", {
      step,
      model: GEMINI_MODEL,
      status: status ?? null,
      detail,
    });

    throw new GeminiCallError({
      step,
      model: GEMINI_MODEL,
      status: status && status >= 400 && status < 600 ? status : 502,
      message: `${step} で Gemini API エラーが発生しました（モデル: ${GEMINI_MODEL}）。`,
      detail,
    });
  }
}
