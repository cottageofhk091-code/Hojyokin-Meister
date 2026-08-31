export const PREMIUM_STORAGE_KEY = "is_premium_user";

export function loadIsPremiumUser(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(PREMIUM_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function saveIsPremiumUser() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PREMIUM_STORAGE_KEY, "true");
}
