"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronDown, Eye, MapPin, Trash2 } from "lucide-react";
import { AuthForm } from "@/components/AuthForm";
import { useAuth } from "@/components/AuthProvider";
import { DevPremiumToggle } from "@/components/DevPremiumToggle";
import {
  collectDashboardAlerts,
  findOverlapsForPlan,
} from "@/lib/history";
import {
  deleteProposalFromAccount,
  fetchProposals,
} from "@/lib/proposals-api";
import { MAX_PROPOSALS } from "@/lib/proposals-limits";
import type { SavedPlan } from "@/lib/types";

export function MyPageDashboard() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setPlans([]);
      return;
    }
    setLoadingPlans(true);
    setError(null);
    void fetchProposals()
      .then((data) => setPlans(data.proposals))
      .catch((err) => {
        setError(err instanceof Error ? err.message : "履歴を取得できませんでした。");
      })
      .finally(() => setLoadingPlans(false));
  }, [user]);

  const alerts = useMemo(() => collectDashboardAlerts(plans), [plans]);

  async function handleDelete(id: string) {
    try {
      const next = await deleteProposalFromAccount(id);
      setPlans(next);
      if (openId === id) setOpenId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "削除に失敗しました。");
    }
  }

  if (authLoading) {
    return (
      <main className="mx-auto w-full max-w-[960px] flex-1 px-5 pb-16 pt-8">
        <p className="text-[14px] text-muted">読み込み中...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto w-full max-w-[28rem] flex-1 px-5 pb-16 pt-8">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-accent">
          MYPAGE
        </p>
        <h1 className="mt-1 text-[26px] font-extrabold tracking-tight text-brand">
          ログインして履歴を見る
        </h1>
        <p className="mt-2 text-[14px] leading-7 text-muted">
          メールアドレスに届く6桁の確認コードでログインしてください。保存した骨子は最大5件まで管理できます。
        </p>
        <div className="card-luxury mt-8 rounded-[24px] border border-line bg-white p-5 sm:p-7">
          <AuthForm />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[960px] flex-1 px-5 pb-16 pt-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-accent">
            MYPAGE
          </p>
          <h1 className="mt-1 text-[26px] font-extrabold tracking-tight text-brand sm:text-[32px]">
            申請履歴
          </h1>
          <p className="mt-2 max-w-[36rem] text-[14px] leading-7 text-muted">
            {user.email} でログイン中です。骨子は最大 {MAX_PROPOSALS}{" "}
            件まで保存できます（{plans.length}/{MAX_PROPOSALS}）。
          </p>
          <p className="mt-2">
            {user.is_subscribed ? (
              <span className="rounded-full bg-[#ecfdf3] px-2.5 py-1 text-[11px] font-bold text-[#166534]">
                プレミアム会員
              </span>
            ) : (
              <span className="rounded-full bg-[#f1f5f9] px-2.5 py-1 text-[11px] font-bold text-muted">
                無料プラン
              </span>
            )}
          </p>
          <div className="mt-3">
            <DevPremiumToggle />
          </div>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="text-[12px] font-semibold text-muted hover:text-accent"
        >
          ログアウト
        </button>
      </div>

      {error ? (
        <p className="mt-4 rounded-2xl bg-[#fff2f2] px-4 py-3 text-[13px] text-[#c41e3a]">
          {error}
        </p>
      ) : null}

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

      {loadingPlans ? (
        <p className="mt-8 text-[14px] text-muted">履歴を読み込んでいます...</p>
      ) : plans.length === 0 ? (
        <div className="card-luxury mt-8 rounded-[24px] border border-line bg-white p-8 text-center">
          <p className="text-[15px] font-semibold">まだ保存された申請計画がありません</p>
          <p className="mt-2 text-[13px] leading-6 text-muted">
            ホームで骨子を作成すると、ここに最大 {MAX_PROPOSALS} 件まで保存されます。
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
                <div className="mt-4 flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href={`/mypage/${plan.id}`}
                      className="inline-flex items-center gap-1 text-[12px] font-semibold text-accent"
                    >
                      <Eye size={14} />
                      閲覧
                    </Link>
                    <button
                      type="button"
                      onClick={() => setOpenId(open ? null : plan.id)}
                      className="inline-flex items-center gap-1 text-[12px] font-semibold text-muted"
                    >
                      {open ? "閉じる" : "重複チェック"}
                      <ChevronDown
                        size={14}
                        className={open ? "rotate-180 transition" : "transition"}
                      />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDelete(plan.id)}
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
