"use client";

import { usePremium } from "@/components/PremiumProvider";
import type { GenerateMode } from "@/lib/types";

export function PlanCompare({
  value,
  onChange,
}: {
  value: GenerateMode;
  onChange: (mode: GenerateMode) => void;
}) {
  const { isPremium, startPremiumCheckout, checkoutLoading } = usePremium();

  return (
    <div className="grid grid-cols-2 rounded-full border border-line bg-[#0F172A] p-1">
      <button
        type="button"
        aria-pressed={value === "free"}
        disabled={checkoutLoading}
        onClick={() => onChange("free")}
        className={`rounded-full px-3 py-2 text-center text-[12px] font-bold sm:text-[13px] ${
          value === "free"
            ? "bg-gradient-to-r from-[#D97706] to-[#F59E0B] text-[#0F172A]"
            : "text-white/70 hover:text-white"
        }`}
      >
        無料版
      </button>
      <button
        type="button"
        aria-pressed={value === "premium"}
        disabled={checkoutLoading}
        onClick={() => {
          if (isPremium) {
            onChange("premium");
            return;
          }
          void startPremiumCheckout();
        }}
        className={`rounded-full px-3 py-2 text-center text-[12px] font-bold sm:text-[13px] ${
          value === "premium" || checkoutLoading
            ? "bg-gradient-to-r from-[#D97706] to-[#F59E0B] text-[#0F172A]"
            : "text-white/70 hover:text-white"
        }`}
      >
        {checkoutLoading ? "決済画面へ移動中..." : "プレミアム"}
      </button>
    </div>
  );
}
