function cleanEnv(value: string | undefined): string {
  return (value || "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\r$/, "");
}

function firstEnv(names: string[]): string {
  for (const name of names) {
    const value = cleanEnv(process.env[name]);
    if (value) return value;
  }
  return "";
}

function isPlaceholderUrl(url: string): boolean {
  return !url || url.includes("placeholder.supabase.co");
}

export function isValidPublicSupabaseUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return (
      (parsed.protocol === "https:" || parsed.protocol === "http:") &&
      Boolean(parsed.hostname) &&
      parsed.hostname !== "placeholder.supabase.co"
    );
  } catch {
    return false;
  }
}

function isPlaceholderKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return (
    !key ||
    normalized === "placeholder" ||
    normalized === "placeholder-anon-key" ||
    normalized === "your-service-role-key" ||
    normalized.startsWith("your_")
  );
}

export function getSupabaseUrl(): string | null {
  const url = firstEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"]).replace(
    /\/$/,
    "",
  );
  if (isPlaceholderUrl(url) || !isValidPublicSupabaseUrl(url)) return null;
  return url;
}

export function getSupabaseAnonKey(): string | null {
  const key = firstEnv([
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
  ]);
  return isPlaceholderKey(key) ? null : key;
}

export function getSupabaseServiceRoleKey(): string | null {
  const key = firstEnv([
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SECRET_KEY",
    "SUPABASE_SERVICE_KEY",
    "SUPABASE_SERVICE_ROLE",
    "SERVICE_ROLE_KEY",
  ]);
  return isPlaceholderKey(key) ? null : key;
}

export function hasSupabasePublicAuth(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

export function hasSupabaseAdminAuth(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseServiceRoleKey());
}

export function getSupabaseAdminConfigError(): string | null {
  const missing: string[] = [];
  if (!getSupabaseUrl()) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!getSupabaseServiceRoleKey()) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (missing.length === 0) return null;
  return (
    `${missing.join(" と ")} が未設定です。` +
    "Supabase 標準メールを使わず Resend で送るため、サーバー用の service_role（または sb_secret_）キーが必要です。" +
    "Vercel / .env.local に設定したあと、開発サーバーを再起動してください。"
  );
}

export function logSupabaseEnvDiagnostics(context: string) {
  const names = Object.keys(process.env)
    .filter((name) => /supabase|service_role|resend|auth_email|app_url/i.test(name))
    .sort();
  const key = getSupabaseServiceRoleKey();
  console.error(`[${context}] env names`, names);
  console.error(`[${context}] snapshot`, {
    url: Boolean(getSupabaseUrl()),
    anon: Boolean(getSupabaseAnonKey()),
    serviceRole: Boolean(key),
    serviceRolePrefix: key ? key.slice(0, 9) : null,
    resend: Boolean(cleanEnv(process.env.RESEND_API_KEY)),
    appUrl: Boolean(cleanEnv(process.env.NEXT_PUBLIC_APP_URL)),
  });
}
