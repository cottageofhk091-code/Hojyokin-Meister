"use client";

import { useEffect, useRef, useState } from "react";
import { Check, LoaderCircle } from "lucide-react";

const GENERATING_STEPS = [
  {
    at: 0,
    label: "① 地域・業種のおすすめ補助金を抽出中...",
    short: "① 補助金を抽出中",
  },
  {
    at: 9000,
    label: "② 審査員に刺さる事業計画書を執筆中...",
    short: "② 計画書を執筆中",
  },
  {
    at: 20000,
    label: "③ 採択率アップのアドバイスをチェック中...",
    short: "③ アドバイスを点検中",
  },
] as const;

function useGeneratingStep(loading: boolean) {
  const startedAtRef = useRef<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  if (loading && startedAtRef.current === null) {
    startedAtRef.current = Date.now();
  }
  if (!loading) {
    startedAtRef.current = null;
  }

  useEffect(() => {
    if (!loading) return undefined;
    const id = window.setInterval(() => setNow(Date.now()), 180);
    return () => window.clearInterval(id);
  }, [loading]);

  if (!loading || startedAtRef.current === null) {
    return { index: 0, ...GENERATING_STEPS[0] };
  }

  const elapsed = now - startedAtRef.current;
  let index = 0;
  for (let i = GENERATING_STEPS.length - 1; i >= 0; i -= 1) {
    if (elapsed >= GENERATING_STEPS[i].at) {
      index = i;
      break;
    }
  }
  return { index, ...GENERATING_STEPS[index] };
}

export function GeneratingProgress({ loading }: { loading: boolean }) {
  const step = useGeneratingStep(loading);
  if (!loading) return null;

  return (
    <div
      className="mt-4 overflow-hidden rounded-[20px] border border-[#F59E0B]/40 bg-[#0F172A] p-4 text-white shadow-[0_16px_40px_rgba(15,23,42,0.22)] sm:p-5"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-[#F59E0B]" />
        <p
          key={step.label}
          className="generating-message text-[13px] font-bold leading-6 text-[#FDE68A] sm:text-[14px]"
        >
          {step.label}
        </p>
      </div>

      <ol className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {GENERATING_STEPS.map((item, index) => {
          const done = index < step.index;
          const active = index === step.index;
          return (
            <li
              key={item.short}
              className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-[11px] font-semibold leading-4 ${
                active
                  ? "generate-step-active border-[#F59E0B]/70 bg-[#F59E0B]/10 text-[#FDE68A]"
                  : done
                    ? "border-white/10 bg-white/5 text-white/80"
                    : "border-white/10 text-white/40"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  done || active
                    ? "bg-gradient-to-r from-[#D97706] to-[#F59E0B] text-[#0F172A]"
                    : "bg-white/10"
                }`}
              >
                {done ? <Check size={12} strokeWidth={3} /> : index + 1}
              </span>
              {item.short}
            </li>
          );
        })}
      </ol>

      <div
        className="mt-4"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="下書き作成の進捗"
      >
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div className="generate-progress-bar h-full rounded-full bg-gradient-to-r from-[#D97706] via-[#F59E0B] to-[#FDE68A]" />
        </div>
      </div>
    </div>
  );
}
