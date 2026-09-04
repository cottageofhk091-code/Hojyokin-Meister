"use client";

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { loadIsPremiumUser, saveIsPremiumUser, setIsPremiumUser } from "@/lib/premium";

type Notice = { kind: "success" | "cancel"; message: string };

type PremiumContextValue = {
  isPremium: boolean;
  checkoutLoading: boolean;
  checkoutError: string | null;
  startPremiumCheckout: () => Promise<void>;
  markPremium: () => void;
  toggleDevPremium: () => Promise<void>;
};

const PremiumContext = createContext<PremiumContextValue | null>(null);

export function usePremium() {
  const value = useContext(PremiumContext);
  if (!value) {
    throw new Error("usePremium は PremiumProvider 内で使ってください。");
  }
  return value;
}

export function PremiumProvider({ children }: { children: ReactNode }) {
  const { user, refresh, setSubscribed } = useAuth();
  const [localPremium, setLocalPremium] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    setLocalPremium(loadIsPremiumUser());
  }, []);

  const isPremium = Boolean(user?.is_subscribed) || (!user && localPremium);

  const markPremium = useCallback(() => {
    saveIsPremiumUser();
    setLocalPremium(true);
  }, []);

  const toggleDevPremium = useCallback(async () => {
    if (process.env.NODE_ENV !== "development") return;
    const response = await fetch("/api/dev/toggle-subscribed", { method: "POST" });
    const data = (await response.json()) as {
      is_subscribed?: boolean;
      localOnly?: boolean;
      error?: string;
    };
    if (!response.ok) {
      throw new Error(data.error || "切替に失敗しました。");
    }
    if (data.localOnly) {
      const next = !localPremium;
      setIsPremiumUser(next);
      setLocalPremium(next);
      return;
    }
    const next = Boolean(data.is_subscribed);
    setSubscribed(next);
    setIsPremiumUser(next);
    setLocalPremium(next);
    await refresh();
  }, [localPremium, refresh, setSubscribed]);

  const startPremiumCheckout = useCallback(async () => {
    if (checkoutLoading) return;
    setCheckoutError(null);
    setCheckoutLoading(true);
    try {
      const response = await fetch("/api/checkout", { method: "POST" });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        throw new Error(data.error || "決済を開始できませんでした。");
      }
      window.location.href = data.url;
    } catch (error) {
      setCheckoutError(
        error instanceof Error
          ? error.message
          : "決済を開始できませんでした。時間をおいて再試行してください。",
      );
      setCheckoutLoading(false);
    }
  }, [checkoutLoading]);

  const handlePaid = useCallback(async () => {
    markPremium();
    for (let i = 0; i < 5; i += 1) {
      await refresh();
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      const data = (await response.json()) as {
        user?: { is_subscribed?: boolean } | null;
      };
      if (data.user?.is_subscribed) break;
      await new Promise((resolve) => window.setTimeout(resolve, 800));
    }
  }, [markPremium, refresh]);

  const value = useMemo(
    () => ({
      isPremium,
      checkoutLoading,
      checkoutError,
      startPremiumCheckout,
      markPremium,
      toggleDevPremium,
    }),
    [
      isPremium,
      checkoutLoading,
      checkoutError,
      startPremiumCheckout,
      markPremium,
      toggleDevPremium,
    ],
  );

  return (
    <PremiumContext.Provider value={value}>
      <Suspense fallback={null}>
        <CheckoutReturnListener
          onNotice={setNotice}
          onPaid={handlePaid}
        />
      </Suspense>
      {notice ? (
        <CheckoutToast notice={notice} onClose={() => setNotice(null)} />
      ) : null}
      {children}
    </PremiumContext.Provider>
  );
}

function CheckoutReturnListener({
  onNotice,
  onPaid,
}: {
  onNotice: (notice: Notice) => void;
  onPaid: () => Promise<void>;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    const success = searchParams.get("success") === "true";
    const canceled = searchParams.get("canceled") === "true";
    if (!success && !canceled) return;
    handled.current = true;

    if (success) {
      void onPaid();
      onNotice({
        kind: "success",
        message: "🎉 プレミアムプランへのアップグレードが完了しました！",
      });
    } else {
      onNotice({
        kind: "cancel",
        message: "決済がキャンセルされました",
      });
    }

    router.replace(pathname, { scroll: false });
  }, [onNotice, onPaid, pathname, router, searchParams]);

  return null;
}

function CheckoutToast({
  notice,
  onClose,
}: {
  notice: Notice;
  onClose: () => void;
}) {
  useEffect(() => {
    const id = window.setTimeout(onClose, 6400);
    return () => window.clearTimeout(id);
  }, [notice, onClose]);

  const success = notice.kind === "success";

  return (
    <div
      role="status"
      className={`checkout-toast fixed top-[76px] left-1/2 z-[80] w-[min(calc(100vw-2rem),32rem)] -translate-x-1/2 rounded-[18px] px-4 py-3 text-center text-[13px] font-semibold leading-6 shadow-[0_16px_40px_rgba(15,23,42,0.18)] sm:text-[14px] ${
        success
          ? "border border-[#F59E0B]/40 bg-[#0F172A] text-white"
          : "border border-line bg-white text-foreground"
      }`}
    >
      {notice.message}
    </div>
  );
}
