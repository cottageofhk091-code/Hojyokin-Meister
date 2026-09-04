"use client";

import { Lock } from "lucide-react";
import { usePremium } from "@/components/PremiumProvider";
import { PREMIUM_PRICE_WITH_TAX } from "@/lib/site";

export function PremiumLockCard() {
  const { startPremiumCheckout, checkoutLoading, checkoutError } = usePremium();

  return (
    <div className="mx-auto w-full max-w-[22rem] rounded-[20px] border border-[#F59E0B]/50 bg-gradient-to-br from-[#0F172A] to-[#1E293B] px-5 py-5 text-center shadow-[0_16px_40px_rgba(15,23,42,0.35)]">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#D97706] to-[#F59E0B] text-[#0F172A]">
        <Lock size={18} />
      </span>
      <p className="mt-3 text-[14px] font-extrabold leading-6 text-white">
        🔒 プレミアムプランで完全版（全文・詳細経費）を解放
      </p>
      <p className="mt-2 text-[13px] font-semibold text-[#FDE68A]">
        {PREMIUM_PRICE_WITH_TAX} / 1回
      </p>
      <button
        type="button"
        onClick={() => void startPremiumCheckout()}
        disabled={checkoutLoading}
        className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#D97706] to-[#F59E0B] px-4 text-[13px] font-bold text-[#0F172A] hover:from-[#B45309] hover:to-[#D97706] disabled:cursor-wait disabled:opacity-80"
      >
        {checkoutLoading
          ? "決済画面へ移動中..."
          : `${PREMIUM_PRICE_WITH_TAX}で購入`}
      </button>
      {checkoutError ? (
        <p className="mt-2 text-[12px] leading-5 text-[#FECACA]">{checkoutError}</p>
      ) : null}
    </div>
  );
}
