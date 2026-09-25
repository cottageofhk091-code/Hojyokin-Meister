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
  const fallback: EmailOtpType[] = ["signup", "email", "magiclink", "recovery"];
  return [...preferred, ...fallback.filter((type) => !preferred.includes(type))];
}

export type VerifyOtpResult = {
  email: string;
  type: EmailOtpType;
  access_token: string | null;
  refresh_token: string | null;
};

function otpErrorMessage(lastError: unknown): string {
  if (lastError instanceof Error) return lastError.message;
  if (typeof lastError === "object" && lastError && "message" in lastError) {
    return String((lastError as { message?: unknown }).message);
  }
  return "verifyOtp に失敗しました";
}

async function verifyWithTypes(
  tokenHash: string,
  types: EmailOtpType[],
): Promise<VerifyOtpResult> {
  const supabaseUrl = getSupabaseUrl();
  const key = getSupabaseAnonKey() || getSupabaseServiceRoleKey();
  if (!supabaseUrl || !key) {
    throw new Error("認証サービスが設定されていません。");
  }

  const supabase = createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false, flowType: "implicit" },
  });

  let lastError: unknown = null;
  for (const type of types) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (!error && data.user?.email) {
      return {
        email: data.user.email.trim().toLowerCase(),
        type,
        access_token: data.session?.access_token ?? null,
        refresh_token: data.session?.refresh_token ?? null,
      };
    }
    lastError = error;
    console.error("[verifyOtp] failed", {
      type,
      message: error?.message,
      status: (error as { status?: number } | null)?.status,
    });
  }

  throw new Error(otpErrorMessage(lastError));
}

export async function verifyEmailOtp(input: {
  tokenHash: string;
  typeRaw: string | null;
}): Promise<VerifyOtpResult> {
  return verifyWithTypes(input.tokenHash, typesToTry(input.typeRaw));
}

export async function verifyRecoveryOtp(input: {
  tokenHash: string;
  typeRaw?: string | null;
}): Promise<VerifyOtpResult> {
  const supabaseUrl = getSupabaseUrl();
  const key = getSupabaseAnonKey() || getSupabaseServiceRoleKey();
  if (!supabaseUrl || !key) {
    throw new Error("認証サービスが設定されていません。");
  }
  const supabase = createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false, flowType: "implicit" },
  });
  const token_hash = input.tokenHash;
  const type = input.typeRaw;
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash,
    type: (type as EmailOtpType) || "recovery",
  });
  if (error) {
    console.error("[verifyOtp.recovery] failed:", error.message, {
      type: type || "recovery",
      error,
    });
    throw error;
  }
  const email = data.user?.email?.trim().toLowerCase();
  if (!email) {
    throw new Error("再設定用セッションを確立できませんでした。");
  }
  return {
    email,
    type: ((type as EmailOtpType) || "recovery") as EmailOtpType,
    access_token: data.session?.access_token ?? null,
    refresh_token: data.session?.refresh_token ?? null,
  };
}
