function cleanEnv(value: string | undefined): string {
  return (value || "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\r$/, "");
}

function isPlaceholderUrl(url: string): boolean {
  return !url || url.includes("placeholder.supabase.co");
}

function isPlaceholderKey(key: string): boolean {
  return !key || key === "placeholder" || key === "placeholder-anon-key";
}

export function getSupabaseUrl(): string | null {
  const url = cleanEnv(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  ).replace(/\/$/, "");
  return isPlaceholderUrl(url) ? null : url;
}

export function getSupabaseAnonKey(): string | null {
  const key = cleanEnv(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
  );
  return isPlaceholderKey(key) ? null : key;
}

export function getSupabaseServiceRoleKey(): string | null {
  const key = cleanEnv(
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY,
  );
  return isPlaceholderKey(key) ? null : key;
}

export function hasSupabasePublicAuth(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

export function hasSupabaseAdminAuth(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseServiceRoleKey());
}
