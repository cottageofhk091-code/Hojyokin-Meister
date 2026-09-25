import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase-env";

export const supabase = createClient(
  getSupabaseUrl() || "https://placeholder.supabase.co",
  getSupabaseAnonKey() || "placeholder-anon-key",
  {
    auth: {
      persistSession: typeof window !== "undefined",
      autoRefreshToken: typeof window !== "undefined",
      detectSessionInUrl: typeof window !== "undefined",
      flowType: "pkce",
    },
  },
);
