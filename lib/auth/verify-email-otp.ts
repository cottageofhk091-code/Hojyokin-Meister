import { createClient, type EmailOtpType } from "@supabase/supabase-js";
import {
  getSupabaseAnonKey,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from "@/lib/supabase-env";
import { logSupabaseNetworkFailure } from "@/lib/supabase-network";

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

function missingEnvError() {
  console.error(
    "Supabase サーバーとの通信に失敗しました。環境変数（NEXT_PUBLIC_SUPABASE_URL）を確認してください。",
    { hasUrl: Boolean(getSupabaseUrl()), hasKey: Boolean(getSupabaseAnonKey() || getSupabaseServiceRoleKey()) },
  );
  return new Error(
    "Supabase サーバーとの通信に失敗しました。環境変数（NEXT_PUBLIC_SUPABASE_URL）を確認してください。",
  );
}

function otpErrorMessage(lastError: unknown): string {
  if (lastError instanceof Error) return lastError.message;
  if (typeof lastError === "object" && lastError && "message" in lastError) {
    return String((lastError as { message?: unknown }).message);
  }
  return "verifyOtp に失敗しました";
}

function createVerifyClient() {
  const supabaseUrl = getSupabaseUrl();
  const key = getSupabaseAnonKey() || getSupabaseServiceRoleKey();
  if (!supabaseUrl || !key) {
    throw missingEnvError();
  }
  return createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false, flowType: "implicit" },
  });
}

async function verifyWithTypes(
  tokenHash: string,
  types: EmailOtpType[],
): Promise<VerifyOtpResult> {
  const supabase = createVerifyClient();

  let lastError: unknown = null;
  for (const type of types) {
    try {
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
      if (error instanceof TypeError || (error as { status?: number } | null)?.status === 0) {
        logSupabaseNetworkFailure("verifyOtp", error);
      }
      console.error("[verifyOtp] failed", {
        type,
        message: error?.message,
        status: (error as { status?: number } | null)?.status,
      });
    } catch (caught) {
      lastError = caught;
      logSupabaseNetworkFailure("verifyOtp", caught);
    }
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
  const supabase = createVerifyClient();
  const token_hash = input.tokenHash;
  const type = input.typeRaw;
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type: (type as EmailOtpType) || "recovery",
    });
    if (error) {
      logSupabaseNetworkFailure("verifyOtp.recovery", error);
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
  } catch (caught) {
    logSupabaseNetworkFailure("verifyOtp.recovery", caught);
    throw caught;
  }
}
