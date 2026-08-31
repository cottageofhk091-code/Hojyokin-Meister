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
import { loadIsPremiumUser, saveIsPremiumUser } from "@/lib/premium";

type Notice = { kind: "success" | "cancel"; message: string };

type PremiumContextValue = {
  isPremium: boolean;
  checkoutLoading: boolean;
  checkoutError: string | null;
  startPremiumCheckout: () => Promise<void>;
  markPremium: () => void;
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
  const [isPremium, setIsPremium] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    setIsPremium(loadIsPremiumUser());
  }, []);

  const markPremium = useCallback(() => {
    saveIsPremiumUser();
    setIsPremium(true);
  }, []);

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

  const value = useMemo(
    () => ({
      isPremium,
      checkoutLoading,
      checkoutError,
      startPremiumCheckout,
      markPremium,
    }),
    [isPremium, checkoutLoading, checkoutError, startPremiumCheckout, markPremium],
  );

  return (
    <PremiumContext.Provider value={value}>
      <Suspense fallback={null}>
        <CheckoutReturnListener onNotice={setNotice} />
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
}: {
  onNotice: (notice: Notice) => void;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { markPremium } = usePremium();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    const success = searchParams.get("success") === "true";
    const canceled = searchParams.get("canceled") === "true";
    if (!success && !canceled) return;
    handled.current = true;

    if (success) {
      markPremium();
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
  }, [markPremium, onNotice, pathname, router, searchParams]);

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
