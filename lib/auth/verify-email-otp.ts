import { createClient, type EmailOtpType } from "@supabase/supabase-js";
import {
  getSupabaseAnonKey,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from "@/lib/supabase-env";

export const EMAIL_OTP_TYPES = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

export function isOtpType(value: string | null): value is EmailOtpType {
  return Boolean(value && EMAIL_OTP_TYPES.has(value as EmailOtpType));
}

function typesToTry(typeRaw: string | null): EmailOtpType[] {
  const preferred = isOtpType(typeRaw) ? [typeRaw] : [];
  const fallback: EmailOtpType[] = ["signup", "email", "magiclink"];
  return [...preferred, ...fallback.filter((type) => !preferred.includes(type))];
}

export async function verifyEmailOtp(input: {
  tokenHash: string;
  typeRaw: string | null;
}): Promise<{ email: string; type: EmailOtpType }> {
  const supabaseUrl = getSupabaseUrl();
  const key = getSupabaseAnonKey() || getSupabaseServiceRoleKey();
  if (!supabaseUrl || !key) {
    throw new Error("認証サービスが設定されていません。");
  }

  const supabase = createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false, flowType: "implicit" },
  });

  let lastError: unknown = null;
  for (const type of typesToTry(input.typeRaw)) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: input.tokenHash,
      type,
    });
    if (!error && data.user?.email) {
      return { email: data.user.email.trim().toLowerCase(), type };
    }
    lastError = error;
    console.error("[verifyEmailOtp] failed", {
      type,
      message: error?.message,
      status: (error as { status?: number } | null)?.status,
    });
  }

  const message =
    lastError instanceof Error
      ? lastError.message
      : typeof lastError === "object" && lastError && "message" in lastError
        ? String((lastError as { message?: unknown }).message)
        : "verifyOtp に失敗しました";
  throw new Error(message);
}
