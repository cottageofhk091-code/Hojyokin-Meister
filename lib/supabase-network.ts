import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase-env";

export const SUPABASE_NETWORK_ENV_MESSAGE =
  "Supabase サーバーとの通信に失敗しました。環境変数（NEXT_PUBLIC_SUPABASE_URL）を確認してください。";

export function isSupabaseNetworkFailure(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (!error || typeof error !== "object") {
    return /failed to fetch|fetch failed|networkerror|load failed/i.test(String(error ?? ""));
  }
  const rec = error as { status?: unknown; message?: unknown };
  if (rec.status === 0) return true;
  const message = typeof rec.message === "string" ? rec.message : "";
  return /failed to fetch|fetch failed|networkerror|load failed/i.test(message);
}

export function logSupabaseNetworkFailure(context: string, error: unknown) {
  if (isSupabaseNetworkFailure(error)) {
    console.error(`[${context}] ${SUPABASE_NETWORK_ENV_MESSAGE}`, {
      status: (error as { status?: unknown } | null)?.status ?? 0,
      hasUrl: Boolean(getSupabaseUrl()),
      hasAnonKey: Boolean(getSupabaseAnonKey()),
      error,
    });
    return;
  }
  console.error(`[${context}]`, error);
}
