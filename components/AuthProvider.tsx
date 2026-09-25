"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AUTH_CHANNEL,
  AUTH_PING_KEY,
  AUTH_RECOVERY_PING_KEY,
  PENDING_SIGNUP_EVENT,
  SIGNUP_WELCOME_MESSAGE,
  clearPendingRecovery,
  clearPendingSignup,
  completeAppSession,
  hasPendingRecovery,
  hasPendingSignup,
  type AppSessionPayload,
} from "@/lib/auth-client";
import { PasswordResetModal } from "@/components/PasswordResetModal";
import { SignupWelcomeModal } from "@/components/SignupWelcomeModal";

export type AuthUser = {
  email: string;
  is_subscribed: boolean;
  free_credits: number;
};

export type UnlockProResult =
  | { ok: true }
  | { ok: false; reason: "auth" | "paywall" | "error" };

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  freeCredits: number;
  sessionTicketUnlock: boolean;
  canUseProFeatures: boolean;
  welcomeMessage: string | null;
  dismissWelcome: () => void;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  setSubscribed: (is_subscribed: boolean) => void;
  applySession: (data: AppSessionPayload, opts?: { welcome?: boolean }) => void;
  unlockProAccess: () => Promise<UnlockProResult>;
  releaseProTrialUnlock: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth は AuthProvider 内で使ってください。");
  }
  return value;
}

function isAuthHelperPage(): boolean {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname;
  return (
    path.startsWith("/auth/password-reset-notice") ||
    path.startsWith("/auth/reset-password") ||
    path.startsWith("/auth/confirmed") ||
    path.startsWith("/auth/continue") ||
    path.startsWith("/auth/reset")
  );
}

function toUser(data: {
  email?: string | null;
  is_subscribed?: boolean;
  free_credits?: number;
}): AuthUser | null {
  const email = data.email?.trim().toLowerCase();
  if (!email) return null;
  return {
    email,
    is_subscribed: Boolean(data.is_subscribed),
    free_credits: Math.max(0, Number(data.free_credits) || 0),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionTicketUnlock, setSessionTicketUnlockState] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);
  const [passwordRecoveryOpen, setPasswordRecoveryOpen] = useState(false);
  const sessionTicketUnlockRef = useRef(false);
  const userRef = useRef(user);
  userRef.current = user;
  const applyingAuthRef = useRef(false);

  const setSessionTicketUnlock = useCallback((value: boolean) => {
    sessionTicketUnlockRef.current = value;
    setSessionTicketUnlockState(value);
  }, []);

  const applySession = useCallback(
    (data: AppSessionPayload, opts?: { welcome?: boolean }) => {
      const next = toUser(data);
      if (!next) return;
      setUser(next);
      if (opts?.welcome) setWelcomeMessage(SIGNUP_WELCOME_MESSAGE);
      clearPendingSignup();
    },
    [],
  );

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", {
        cache: "no-store",
        credentials: "include",
      });
      const data = (await response.json()) as { user?: AuthUser | null };
      setUser(
        data.user
          ? {
              email: data.user.email,
              is_subscribed: Boolean(data.user.is_subscribed),
              free_credits: Math.max(0, Number(data.user.free_credits) || 0),
            }
          : null,
      );
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("registered") !== "true") return;
    setWelcomeMessage(SIGNUP_WELCOME_MESSAGE);
    void refresh();
    params.delete("registered");
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", next);
  }, [refresh]);

  const hydrateFromCookie = useCallback(
    async (opts?: { welcomeIfPending?: boolean }) => {
      if (applyingAuthRef.current || userRef.current) return;
      applyingAuthRef.current = true;
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
          credentials: "include",
        });
        const data = (await response.json()) as { user?: AuthUser | null };
        if (!data.user?.email) return;
        applySession(data.user, {
          welcome: Boolean(opts?.welcomeIfPending && hasPendingSignup()),
        });
      } catch {
        // stay guest
      } finally {
        applyingAuthRef.current = false;
      }
    },
    [applySession],
  );

  useEffect(() => {
    let cancelled = false;
    let channel: BroadcastChannel | null = null;
    let pollTimer: number | null = null;
    let subscription: { unsubscribe: () => void } | null = null;

    const onAuthEvent = async (event: string, accessToken?: string | null) => {
      if (cancelled) return;
      if (isAuthHelperPage()) return;
      if (event === "PASSWORD_RECOVERY" || (hasPendingRecovery() && event === "SIGNED_IN")) {
        setPasswordRecoveryOpen(true);
        if (event === "PASSWORD_RECOVERY") return;
      }
      if (userRef.current) return;
      if (event !== "SIGNED_IN" && event !== "USER_UPDATED") return;
      if (!accessToken) {
        await hydrateFromCookie({ welcomeIfPending: true });
        return;
      }
      if (applyingAuthRef.current) return;
      applyingAuthRef.current = true;
      try {
        const data = await completeAppSession(accessToken, hasPendingSignup());
        if (cancelled) return;
        applySession(data, { welcome: hasPendingSignup() });
      } catch {
        await hydrateFromCookie({ welcomeIfPending: true });
      } finally {
        applyingAuthRef.current = false;
      }
    };

    void (async () => {
      try {
        const { supabase } = await import("@/lib/supabaseClient");
        const { data } = supabase.auth.onAuthStateChange((event, session) => {
          void onAuthEvent(event, session?.access_token);
        });
        if (cancelled) {
          data.subscription.unsubscribe();
          return;
        }
        subscription = data.subscription;
      } catch {
        // supabase client may be unconfigured
      }
    })();

    const onStorage = (e: StorageEvent) => {
      if (e.key === AUTH_RECOVERY_PING_KEY && e.newValue) {
        if (!isAuthHelperPage()) setPasswordRecoveryOpen(true);
        return;
      }
      if (e.key !== AUTH_PING_KEY || !e.newValue) return;
      void hydrateFromCookie({ welcomeIfPending: true });
    };
    window.addEventListener("storage", onStorage);

    const onVisible = () => {
      if (document.visibilityState === "visible" && hasPendingSignup()) {
        void hydrateFromCookie({ welcomeIfPending: true });
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    const startPendingPoll = () => {
      if (pollTimer || userRef.current) return;
      pollTimer = window.setInterval(() => {
        if (userRef.current) {
          if (pollTimer) window.clearInterval(pollTimer);
          pollTimer = null;
          return;
        }
        if (!hasPendingSignup()) return;
        void hydrateFromCookie({ welcomeIfPending: true });
      }, 2500);
    };
    window.addEventListener(PENDING_SIGNUP_EVENT, startPendingPoll);
    if (hasPendingSignup()) startPendingPoll();

    try {
      channel = new BroadcastChannel(AUTH_CHANNEL);
      channel.onmessage = (event) => {
        if (event?.data?.type === "password-recovery") {
          if (!isAuthHelperPage()) setPasswordRecoveryOpen(true);
          return;
        }
        void hydrateFromCookie({ welcomeIfPending: true });
      };
    } catch {
      channel = null;
    }

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(PENDING_SIGNUP_EVENT, startPendingPoll);
      document.removeEventListener("visibilitychange", onVisible);
      channel?.close();
      if (pollTimer) window.clearInterval(pollTimer);
    };
  }, [applySession, hydrateFromCookie]);

  const signOut = useCallback(async () => {
    try {
      const { supabase } = await import("@/lib/supabaseClient");
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setSessionTicketUnlock(false);
    setWelcomeMessage(null);
    clearPendingSignup();
    clearPendingRecovery();
  }, [setSessionTicketUnlock]);

  const setSubscribed = useCallback((is_subscribed: boolean) => {
    setUser((prev) => (prev ? { ...prev, is_subscribed } : prev));
  }, []);

  const releaseProTrialUnlock = useCallback(() => {
    setSessionTicketUnlock(false);
  }, [setSessionTicketUnlock]);

  const unlockProAccess = useCallback(async (): Promise<UnlockProResult> => {
    if (userRef.current?.is_subscribed || sessionTicketUnlockRef.current) {
      return { ok: true };
    }
    if (!userRef.current) return { ok: false, reason: "auth" };
    try {
      const res = await fetch("/api/me/unlock-pro", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        unlocked?: boolean;
        alreadyPro?: boolean;
        usedTicket?: boolean;
        free_credits?: number;
        is_subscribed?: boolean;
      };
      const remaining =
        typeof data.free_credits === "number"
          ? Math.max(0, data.free_credits)
          : userRef.current.free_credits;
      setUser((prev) =>
        prev
          ? {
              ...prev,
              free_credits: remaining,
              is_subscribed: data.alreadyPro ? true : prev.is_subscribed,
            }
          : prev,
      );
      if (res.status === 401) return { ok: false, reason: "auth" };
      if (res.status === 402 || res.status === 403) {
        return { ok: false, reason: "paywall" };
      }
      if (!res.ok || !data.unlocked) return { ok: false, reason: "error" };
      setSessionTicketUnlock(true);
      return { ok: true };
    } catch {
      return { ok: false, reason: "error" };
    }
  }, [setSessionTicketUnlock]);

  const canUseProFeatures = Boolean(user?.is_subscribed) || sessionTicketUnlock;
  const freeCredits = user?.free_credits ?? 0;

  const value = useMemo(
    () => ({
      user,
      loading,
      freeCredits,
      sessionTicketUnlock,
      canUseProFeatures,
      welcomeMessage,
      dismissWelcome: () => setWelcomeMessage(null),
      refresh,
      signOut,
      setSubscribed,
      applySession,
      unlockProAccess,
      releaseProTrialUnlock,
    }),
    [
      applySession,
      canUseProFeatures,
      freeCredits,
      loading,
      refresh,
      releaseProTrialUnlock,
      sessionTicketUnlock,
      setSubscribed,
      signOut,
      unlockProAccess,
      user,
      welcomeMessage,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <SignupWelcomeModal
        open={Boolean(welcomeMessage)}
        onClose={() => setWelcomeMessage(null)}
      />
      <PasswordResetModal
        open={passwordRecoveryOpen}
        onClose={() => {
          setPasswordRecoveryOpen(false);
          clearPendingRecovery();
        }}
        onCompleted={(data) => {
          applySession(data);
          clearPendingRecovery();
        }}
      />
    </AuthContext.Provider>
  );
}
