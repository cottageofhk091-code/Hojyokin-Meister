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
  setIsPremiumUser(true);
}

export function setIsPremiumUser(value: boolean) {
  if (typeof window === "undefined") return;
  if (value) {
    window.localStorage.setItem(PREMIUM_STORAGE_KEY, "true");
    return;
  }
  window.localStorage.removeItem(PREMIUM_STORAGE_KEY);
}
