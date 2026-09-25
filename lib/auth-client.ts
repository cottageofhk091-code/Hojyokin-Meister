export const PENDING_SIGNUP_KEY = "aim_pending_signup";
export const AUTH_PING_KEY = "aim_auth_ping";
export const AUTH_CHANNEL = "aim_auth";
export const SIGNUP_WELCOME_MESSAGE =
  "新規登録ありがとうございます！1回無料のプレミアム機能をお試しいただけます。";

export type AppSessionPayload = {
  email?: string;
  is_subscribed?: boolean;
  free_credits?: number;
  bonusGranted?: boolean;
};

export async function completeAppSession(
  accessToken: string,
  grantBonus: boolean,
): Promise<AppSessionPayload> {
  const res = await fetch("/api/auth/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_token: accessToken, grantBonus }),
  });
  const data = (await res.json().catch(() => ({}))) as AppSessionPayload & {
    error?: string;
  };
  if (!res.ok || !data.email) throw new Error(data.error || "認証に失敗しました");
  return data;
}

export const PENDING_SIGNUP_EVENT = "aim_pending_signup";

export function markPendingSignup(email: string): void {
  try {
    sessionStorage.setItem(PENDING_SIGNUP_KEY, email.trim().toLowerCase());
  } catch {
    // ignore
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PENDING_SIGNUP_EVENT));
  }
}

export function clearPendingSignup(): void {
  try {
    sessionStorage.removeItem(PENDING_SIGNUP_KEY);
  } catch {
    // ignore
  }
}

export function hasPendingSignup(): boolean {
  try {
    return Boolean(sessionStorage.getItem(PENDING_SIGNUP_KEY));
  } catch {
    return false;
  }
}

export const PENDING_RECOVERY_KEY = "aim_pending_recovery";
export const PENDING_RECOVERY_EVENT = "aim_pending_recovery";
export const AUTH_RECOVERY_PING_KEY = "aim_auth_recovery_ping";

export function markPendingRecovery(email: string): void {
  try {
    sessionStorage.setItem(PENDING_RECOVERY_KEY, email.trim().toLowerCase());
  } catch {
    // ignore
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PENDING_RECOVERY_EVENT));
  }
}

export function clearPendingRecovery(): void {
  try {
    sessionStorage.removeItem(PENDING_RECOVERY_KEY);
  } catch {
    // ignore
  }
}

export function hasPendingRecovery(): boolean {
  try {
    return Boolean(sessionStorage.getItem(PENDING_RECOVERY_KEY));
  } catch {
    return false;
  }
}

export function notifyPasswordRecovery(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AUTH_RECOVERY_PING_KEY, JSON.stringify({ at: Date.now() }));
  } catch {
    // ignore
  }
  try {
    const channel = new BroadcastChannel(AUTH_CHANNEL);
    channel.postMessage({ type: "password-recovery" });
    channel.close();
  } catch {
    // ignore
  }
}

export function notifySignupConfirmed(payload: { bonusGranted?: boolean } = {}): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AUTH_PING_KEY, JSON.stringify({ at: Date.now(), ...payload }));
  } catch {
    // ignore
  }
  try {
    const channel = new BroadcastChannel(AUTH_CHANNEL);
    channel.postMessage({ type: "signup-confirmed", ...payload });
    channel.close();
  } catch {
    // ignore
  }
}
