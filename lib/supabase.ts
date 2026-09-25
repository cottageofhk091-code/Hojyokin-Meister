import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl, isValidPublicSupabaseUrl } from "@/lib/supabase-env";
import {
  isSupabaseNetworkFailure,
  logSupabaseNetworkFailure,
  SUPABASE_NETWORK_ENV_MESSAGE,
} from "@/lib/supabase-network";

export {
  isSupabaseNetworkFailure,
  logSupabaseNetworkFailure,
  SUPABASE_NETWORK_ENV_MESSAGE,
};

export function isSupabaseBrowserConfigured(): boolean {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  return Boolean(url && key && isValidPublicSupabaseUrl(url));
}

function guardedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, init).catch((error: unknown) => {
    logSupabaseNetworkFailure("supabase.fetch", error);
    if (error instanceof TypeError) throw error;
    throw new TypeError(SUPABASE_NETWORK_ENV_MESSAGE);
  });
}

function createBrowserSupabaseClient(): SupabaseClient {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key || !isValidPublicSupabaseUrl(url)) {
    if (typeof window !== "undefined") {
      console.error(SUPABASE_NETWORK_ENV_MESSAGE, {
        hasUrl: Boolean(url),
        hasAnonKey: Boolean(key),
      });
    }
    return createClient("https://invalid.local", "missing-anon-key", {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        fetch: async () => {
          const error = new TypeError(SUPABASE_NETWORK_ENV_MESSAGE);
          logSupabaseNetworkFailure("supabase.createClient", error);
          throw error;
        },
      },
    });
  }

  return createClient(url, key, {
    auth: {
      persistSession: typeof window !== "undefined",
      autoRefreshToken: typeof window !== "undefined",
      detectSessionInUrl: typeof window !== "undefined",
      flowType: "pkce",
    },
    global: {
      fetch: guardedFetch,
    },
  });
}

export const supabase = createBrowserSupabaseClient();
