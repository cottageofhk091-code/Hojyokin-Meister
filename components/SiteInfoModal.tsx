"use client";

import { FileCheck, Sparkles } from "lucide-react";
import { InfoModal } from "@/components/InfoModal";
import { usePremium } from "@/components/PremiumProvider";
import {
  FAQS,
  FEATURE_DETAILS,
  PRICING_PLANS,
} from "@/lib/site-content";
import { PREMIUM_PRICE_WITH_TAX } from "@/lib/site";

export type InfoModalKey = "features" | "pricing" | "faq";

export function SiteInfoModal({
  openKey,
  onClose,
}: {
  openKey: InfoModalKey | null;
  onClose: () => void;
}) {
  const { isPremium, startPremiumCheckout, checkoutLoading, checkoutError } =
    usePremium();
  return (
    <>
      <InfoModal
        kicker="SUPPORT"
        title="4つの支援"
        open={openKey === "features"}
        onClose={onClose}
      >
        <div className="space-y-4">
          {FEATURE_DETAILS.map((item, index) => (
            <article
              key={item.title}
              className="rounded-[20px] border border-line bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]"
            >
              <p className="text-[11px] font-semibold tracking-wide text-accent">
                0{index + 1}
              </p>
              <h3 className="mt-1 text-[15px] font-bold tracking-tight">
                {item.title}
              </h3>
              <p className="mt-2 text-[13px] leading-6 text-muted">{item.body}</p>
            </article>
          ))}
        </div>
      </InfoModal>

      <InfoModal
        kicker="PRICING"
        title="料金"
        open={openKey === "pricing"}
        onClose={onClose}
      >
        <p className="mb-5 text-[13px] leading-6 text-muted">
          プレミアムは {PREMIUM_PRICE_WITH_TAX} / 1回の決済で、完全版の事業計画書・経費テーブル・AIチャット相談を解放します。
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {PRICING_PLANS.map((plan) => (
            <article
              key={plan.name}
              className={`rounded-[20px] border p-4 ${
                plan.featured
                  ? "border-[#F59E0B]/50 bg-[#0F172A] text-white"
                  : "border-line bg-white"
              }`}
            >
              {plan.featured ? (
                <p className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#F59E0B]">
                  <Sparkles size={12} />
                  推奨
                </p>
              ) : (
                <p className="text-[11px] font-semibold text-accent">{plan.note}</p>
              )}
              <h3 className="mt-1 text-[15px] font-bold">{plan.name}</h3>
              <p
                className={`mt-1 text-[22px] font-extrabold ${
                  plan.featured ? "text-[#F59E0B]" : "text-brand"
                }`}
              >
                {plan.price}
              </p>
              {plan.featured ? (
                <p className="text-[11px] font-semibold text-white/70">{plan.note}</p>
              ) : null}
              <ul className="mt-3 space-y-1.5 text-[12px] leading-5">
                {plan.points.map((point) => (
                  <li key={point} className="flex gap-1.5">
                    <FileCheck
                      size={14}
                      className={`mt-0.5 shrink-0 ${plan.featured ? "text-[#F59E0B]" : "text-accent"}`}
                    />
                    <span className={plan.featured ? "text-white/80" : "text-muted"}>
                      {point}
                    </span>
                  </li>
                ))}
              </ul>
              {plan.featured ? (
                isPremium ? (
                  <p className="mt-4 rounded-full bg-white/10 py-2 text-center text-[12px] font-bold text-[#FDE68A]">
                    ご利用中
                  </p>
                ) : (
                  <>
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
                      <p className="mt-2 text-[12px] leading-5 text-[#FECACA]">
                        {checkoutError}
                      </p>
                    ) : null}
                  </>
                )
              ) : null}
            </article>
          ))}
        </div>
      </InfoModal>

      <InfoModal
        kicker="FAQ"
        title="よくある質問"
        open={openKey === "faq"}
        onClose={onClose}
      >
        <div className="space-y-3">
          {FAQS.map((item) => (
            <article
              key={item.q}
              className="rounded-[18px] border border-line bg-white px-4 py-3"
            >
              <h3 className="text-[14px] font-bold tracking-tight">{item.q}</h3>
              <p className="mt-1.5 text-[13px] leading-6 text-muted">{item.a}</p>
            </article>
          ))}
        </div>
      </InfoModal>
    </>
  );
}
