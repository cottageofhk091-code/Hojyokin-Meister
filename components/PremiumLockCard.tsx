"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { usePremium } from "@/components/PremiumProvider";
import { PREMIUM_PRICE_WITH_TAX } from "@/lib/site";

export function PremiumLockCard() {
  const { user, freeCredits, unlockProAccess } = useAuth();
  const { startPremiumCheckout, checkoutLoading, checkoutError } = usePremium();
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const canUseTrial = Boolean(user?.email) && freeCredits > 0;

  async function handleUseTrial() {
    if (unlocking) return;
    setUnlockError(null);
    setUnlocking(true);
    try {
      const result = await unlockProAccess();
      if (result.ok) return;
      if (result.reason === "auth") {
        setUnlockError("お試し枠の利用にはログインが必要です。");
        return;
      }
      if (result.reason === "paywall") {
        setUnlockError("Pro無料枠は終了しています。プレミアムプランで全表示できます。");
        return;
      }
      setUnlockError("ロック解除に失敗しました。しばらくしてから再度お試しください。");
    } finally {
      setUnlocking(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[22rem] rounded-[20px] border border-[#F59E0B]/50 bg-gradient-to-br from-[#0F172A] to-[#1E293B] px-5 py-5 text-center shadow-[0_16px_40px_rgba(15,23,42,0.35)]">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#D97706] to-[#F59E0B] text-[#0F172A]">
        <Lock size={18} />
      </span>
      <p className="mt-3 text-[14px] font-extrabold leading-6 text-white">
        {canUseTrial
          ? "1回無料お試しで全表示する"
          : "🔒 プレミアムプランで完全版（全文・詳細経費）を解放"}
      </p>
      {canUseTrial ? (
        <p className="mt-2 text-[13px] font-semibold text-[#FDE68A]">
          🎁 Pro無料お試し：残り {freeCredits} 回
        </p>
      ) : (
        <p className="mt-2 text-[13px] font-semibold text-[#FDE68A]">
          {PREMIUM_PRICE_WITH_TAX} / 1回
        </p>
      )}
      {canUseTrial ? (
        <button
          type="button"
          onClick={() => void handleUseTrial()}
          disabled={unlocking}
          className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#D97706] to-[#F59E0B] px-4 text-[13px] font-bold text-[#0F172A] hover:from-[#B45309] hover:to-[#D97706] disabled:cursor-wait disabled:opacity-80"
        >
          {unlocking ? "解除中..." : "お試し枠を使用する"}
        </button>
      ) : null}
      {!user?.email ? (
        <Link
          href="/login?next=/"
          className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#D97706] to-[#F59E0B] px-4 text-[13px] font-bold text-[#0F172A] hover:from-[#B45309] hover:to-[#D97706]"
        >
          ログインしてお試し枠を使う
        </Link>
      ) : null}
      <button
        type="button"
        onClick={() => void startPremiumCheckout()}
        disabled={checkoutLoading}
        className={`${canUseTrial || !user?.email ? "mt-2" : "mt-4"} inline-flex min-h-10 w-full items-center justify-center rounded-full border border-[#FDE68A]/40 bg-white/5 px-4 text-[13px] font-bold text-[#FDE68A] hover:bg-white/10 disabled:cursor-wait disabled:opacity-80`}
      >
        {checkoutLoading
          ? "決済画面へ移動中..."
          : `${PREMIUM_PRICE_WITH_TAX}で購入`}
      </button>
      {unlockError ? (
        <p className="mt-2 text-[12px] leading-5 text-[#FECACA]">{unlockError}</p>
      ) : null}
      {checkoutError ? (
        <p className="mt-2 text-[12px] leading-5 text-[#FECACA]">{checkoutError}</p>
      ) : null}
    </div>
  );
}
