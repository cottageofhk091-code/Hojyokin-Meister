"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronDown, MapPin, Trash2 } from "lucide-react";
import {
  collectDashboardAlerts,
  deleteSavedPlan,
  findOverlapsForPlan,
  loadSavedPlans,
} from "@/lib/history";
import type { SavedPlan } from "@/lib/types";

export function MyPageDashboard() {
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    setPlans(loadSavedPlans());
  }, []);
  const alerts = useMemo(() => collectDashboardAlerts(plans), [plans]);

  function handleDelete(id: string) {
    setPlans(deleteSavedPlan(id));
    if (openId === id) setOpenId(null);
  }

  return (
    <main className="mx-auto w-full max-w-[960px] flex-1 px-5 pb-16 pt-8">
      <p className="text-[11px] font-semibold tracking-[0.2em] text-accent">
        MYPAGE
      </p>
      <h1 className="mt-1 text-[26px] font-extrabold tracking-tight text-brand sm:text-[32px]">
        申請履歴
      </h1>
      <p className="mt-2 max-w-[36rem] text-[14px] leading-7 text-muted">
        生成した事業計画をカードで管理します。同じ経費・物品が複数の計画に重なっている場合は、重複リスクとして通知します。
      </p>

      {alerts.length > 0 ? (
        <div className="mt-6 rounded-[20px] border border-[#D97706]/40 bg-[#fff8ee] px-4 py-4">
          <p className="flex items-center gap-2 text-[14px] font-bold text-[#9a3412]">
            <AlertTriangle size={18} />
            重複申請の可能性がある計画が {alerts.length} 件あります
          </p>
          <ul className="mt-2 space-y-1 text-[13px] leading-6 text-[#9a3412]/90">
            {alerts.map((alert) => (
              <li key={alert.planId}>
                「{alert.title}」（{alert.subsidyType}）に類似品目が {alert.count}{" "}
                件
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {plans.length === 0 ? (
        <div className="card-luxury mt-8 rounded-[24px] border border-line bg-white p-8 text-center">
          <p className="text-[15px] font-semibold">まだ保存された申請計画がありません</p>
          <p className="mt-2 text-[13px] leading-6 text-muted">
            ホームで骨子を作成し、「マイページに保存する」を押すと、ここに履歴が並びます。
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex min-h-11 items-center rounded-full bg-gradient-to-r from-[#D97706] to-[#F59E0B] px-5 text-[14px] font-bold text-[#0F172A]"
          >
            申請書を作成する
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {plans.map((plan) => {
            const hits = findOverlapsForPlan(plan, plans);
            const open = openId === plan.id;
            return (
              <article
                key={plan.id}
                className="card-luxury rounded-[22px] border border-line bg-white p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold tracking-wide text-accent">
                      {plan.subsidyType}
                    </p>
                    <h2 className="mt-1 text-[15px] font-bold leading-6 tracking-tight">
                      {plan.title}
                    </h2>
                  </div>
                  {hits.length > 0 ? (
                    <span className="shrink-0 rounded-full bg-[#fff1e0] px-2 py-1 text-[10px] font-bold text-[#9a3412]">
                      重複 {hits.length}
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-[#ecfdf3] px-2 py-1 text-[10px] font-bold text-[#166534]">
                      重複なし
                    </span>
                  )}
                </div>
                <p className="mt-2 flex items-center gap-1 text-[12px] text-muted">
                  <MapPin size={13} />
                  {plan.location} / {plan.industry}
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  {new Date(plan.savedAt).toLocaleString("ja-JP")}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {plan.expenseItems.slice(0, 4).map((item) => (
                    <span
                      key={item}
                      className="rounded-full bg-[#f7f1e6] px-2 py-1 text-[11px] text-brand"
                    >
                      {item}
                    </span>
                  ))}
                </div>
                {open ? (
                  <div className="mt-4 space-y-2 rounded-2xl bg-[#fbfaf7] p-3 text-[12px] leading-5 text-muted">
                    {hits.length > 0 ? (
                      <ul className="space-y-1 text-[#9a3412]">
                        {hits.slice(0, 5).map((hit) => (
                          <li key={`${hit.currentItem}-${hit.historyTitle}`}>
                            「{hit.currentItem}」が「{hit.historyTitle}」（
                            {hit.subsidyType}）と類似
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>他の保存計画と品目の明確な重複は見つかりませんでした。</p>
                    )}
                    {plan.snapshot?.plan.overview ? (
                      <p className="pt-1">{plan.snapshot.plan.overview}</p>
                    ) : null}
                  </div>
                ) : null}
                <div className="mt-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : plan.id)}
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-accent"
                  >
                    {open ? "閉じる" : "重複チェックを見る"}
                    <ChevronDown
                      size={14}
                      className={open ? "rotate-180 transition" : "transition"}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(plan.id)}
                    className="inline-flex items-center gap-1 text-[12px] text-muted hover:text-[#c41e3a]"
                    aria-label="この履歴を削除"
                  >
                    <Trash2 size={14} />
                    削除
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
