import { createClient, type EmailOtpType } from "@supabase/supabase-js";
import { getPublicAppUrl } from "@/lib/auth/base-url";
import {
  getSupabaseAnonKey,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from "@/lib/supabase-env";

export type AuthLinkKind = "signup" | "recovery" | "magiclink";
export { getPublicAppUrl };

export function getSupabasePublicAuthClient() {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey() || getSupabaseServiceRoleKey();
  if (!url || !key) {
    throw new Error("認証サービスが設定されていません。");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getSupabaseAdmin() {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();
  if (!url || !key) {
    throw new Error(
      "認証サービスが設定されていません。NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を確認してください。",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function buildAuthActionUrl(
  tokenHash: string,
  type: EmailOtpType,
  req?: Request,
): string {
  const base = getPublicAppUrl(req);
  const url = new URL(
    type === "recovery" ? "/api/auth/verify-reset" : "/auth/callback",
    `${base}/`,
  );
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", type);
  if (type === "signup" || type === "email" || type === "magiclink") {
    url.searchParams.set("registered", "true");
  }
  return url.toString();
}

type AuthUserRow = {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
};

export async function findAuthUserByEmail(email: string): Promise<AuthUserRow | null> {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();
  if (!url || !key) return null;
  const endpoint = `${url.replace(/\/$/, "")}/auth/v1/admin/users?email=${encodeURIComponent(email)}`;
  const res = await fetch(endpoint, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = (await res.json()) as
    | { users?: AuthUserRow[]; user?: AuthUserRow }
    | AuthUserRow[];
  const rows = Array.isArray(json)
    ? json
    : json.users ?? (json.user ? [json.user] : []);
  const match =
    rows.find((row) => (row.email || "").toLowerCase() === email.toLowerCase()) ??
    rows[0];
  return match?.id ? match : null;
}

export function isAuthUserConfirmed(user: AuthUserRow): boolean {
  return Boolean(user.email_confirmed_at || user.confirmed_at);
}

export async function generateAuthActionLink(input: {
  type: AuthLinkKind;
  email: string;
  password?: string;
  req?: Request;
}): Promise<{ hashedToken: string; actionUrl: string }> {
  const url = getSupabaseUrl();
  const serviceKey = getSupabaseServiceRoleKey();
  if (!url || !serviceKey) {
    throw new Error(
      "[generateLink] SUPABASE_SERVICE_ROLE_KEY または Supabase URL が未設定です。",
    );
  }

  const admin = getSupabaseAdmin();
  const redirectTo =
    input.type === "recovery"
      ? `${getPublicAppUrl(input.req)}/api/auth/verify-reset`
      : `${getPublicAppUrl(input.req)}/auth/callback?registered=true`;
  console.info("[generateLink] redirectTo", { type: input.type, redirectTo });

  const result =
    input.type === "signup"
      ? await admin.auth.admin.generateLink({
          type: "signup",
          email: input.email,
          password: input.password || "",
          options: { redirectTo },
        })
      : await admin.auth.admin.generateLink({
          type: input.type,
          email: input.email,
          options: { redirectTo },
        });
  const { data, error } = result;
  if (error) {
    throw new Error(`[generateLink] ${error.message}`);
  }
  const hashedToken = data.properties?.hashed_token;
  if (!hashedToken) {
    throw new Error("[generateLink] hashed_token が返りませんでした。");
  }
  const type: EmailOtpType =
    input.type === "signup"
      ? "signup"
      : input.type === "recovery"
        ? "recovery"
        : "magiclink";
  return {
    hashedToken,
    actionUrl: buildAuthActionUrl(hashedToken, type, input.req),
  };
}
