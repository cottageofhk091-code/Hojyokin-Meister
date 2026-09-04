"use client";

import { useState } from "react";
import { usePremium } from "@/components/PremiumProvider";

const IS_DEV = process.env.NODE_ENV === "development";

export function DevPremiumToggle({ compact = false }: { compact?: boolean }) {
  const { isPremium, toggleDevPremium } = usePremium();
  const [busy, setBusy] = useState(false);

  if (!IS_DEV) return null;

  return (
    <button
      type="button"
      disabled={busy}
      title={`開発用: 現在は${isPremium ? "有料" : "無料"}です`}
      onClick={() => {
        setBusy(true);
        void toggleDevPremium().finally(() => setBusy(false));
      }}
      className={
        compact
          ? "block w-full rounded-xl border border-dashed border-[#F59E0B]/70 px-3 py-2.5 text-left text-[13px] font-bold text-[#FDE68A] hover:bg-white/5 disabled:opacity-60"
          : "rounded-full border border-dashed border-[#F59E0B]/70 px-3 py-1.5 text-[11px] font-bold text-[#FDE68A] hover:bg-white/5 disabled:opacity-60"
      }
    >
      {busy ? "【DEV】切替中..." : `【DEV】有料/無料切替（${isPremium ? "有料" : "無料"}）`}
    </button>
  );
}
