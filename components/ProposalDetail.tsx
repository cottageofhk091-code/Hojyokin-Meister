"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { useAuth } from "@/components/AuthProvider";
import { ResultView } from "@/components/ResultView";
import { usePremium } from "@/components/PremiumProvider";
import { deleteProposalFromAccount, fetchProposal } from "@/lib/proposals-api";
import { isGenerateResult, type SavedPlan } from "@/lib/types";

export function ProposalDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { isPremium } = usePremium();
  const [plan, setPlan] = useState<SavedPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !params.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void fetchProposal(params.id)
      .then((data) => {
        setPlan(data);
        if (!data) setError("骨子が見つかりません。");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "骨子を取得できませんでした。");
      })
      .finally(() => setLoading(false));
  }, [params.id, user]);

  async function handleDelete() {
    if (!plan) return;
    try {
      await deleteProposalFromAccount(plan.id);
      router.replace("/mypage");
    } catch (err) {
      setError(err instanceof Error ? err.message : "削除に失敗しました。");
    }
  }

  if (authLoading || loading) {
    return (
      <main className="mx-auto w-full max-w-[960px] flex-1 px-5 pb-16 pt-8">
        <p className="text-[14px] text-muted">読み込み中...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto w-full max-w-[28rem] flex-1 px-5 pb-16 pt-8">
        <h1 className="text-[24px] font-extrabold tracking-tight text-brand">
          ログインが必要です
        </h1>
        <p className="mt-2 text-[14px] text-muted">
          保存した骨子を閲覧するにはログインしてください。
        </p>
        <div className="card-luxury mt-8 rounded-[24px] border border-line bg-white p-5 sm:p-7">
          <AuthForm onSuccess={() => router.refresh()} />
        </div>
      </main>
    );
  }

  const snapshot = plan?.snapshot;

  return (
    <main className="mx-auto w-full max-w-[960px] flex-1 px-5 pb-16 pt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/mypage" className="text-[13px] font-semibold text-accent">
          ← 申請履歴へ戻る
        </Link>
        {plan ? (
          <button
            type="button"
            onClick={() => void handleDelete()}
            className="text-[12px] font-semibold text-muted hover:text-[#c41e3a]"
          >
            この骨子を削除
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="mt-6 rounded-2xl bg-[#fff2f2] px-4 py-3 text-[13px] text-[#c41e3a]">
          {error}
        </p>
      ) : null}

      {plan && snapshot && isGenerateResult(snapshot) ? (
        <div className="mt-6">
          <ResultView
            result={snapshot}
            mode={isPremium ? "premium" : "free"}
            generatedMode={snapshot.mode ?? "free"}
            context={{
              location: plan.location,
              industry: plan.industry,
              subsidyType: plan.subsidyType,
            }}
            saved
            showSave={false}
          />
        </div>
      ) : plan ? (
        <section className="card-luxury mt-6 rounded-[24px] border border-line bg-white p-5 sm:p-7">
          <p className="text-[12px] font-semibold text-accent">{plan.subsidyType}</p>
          <h1 className="mt-1 text-[22px] font-extrabold tracking-tight">{plan.title}</h1>
          <p className="mt-2 text-[13px] text-muted">
            {plan.location} / {plan.industry} /{" "}
            {new Date(plan.savedAt).toLocaleString("ja-JP")}
          </p>
          <p className="mt-4 text-[14px] leading-7 text-muted">
            この保存データには詳細な骨子スナップショットがありません。
          </p>
        </section>
      ) : null}
    </main>
  );
}
