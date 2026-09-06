"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { track } from "@vercel/analytics"; // ★ Analytics の追記
import {
  GeneratingProgress,
} from "@/components/GeneratingStatus";
import { ResultView } from "@/components/ResultView";
import { MeisterChatDock } from "@/components/MeisterChat";
import { PlanCompare } from "@/components/PlanCompare";
import { useAuth } from "@/components/AuthProvider";
import { usePremium } from "@/components/PremiumProvider";
import {
  fetchProposals,
  LIMIT_MESSAGE,
  saveProposalToAccount,
} from "@/lib/proposals-api";
import { loadSavedPlans, resultToSavedPlan, savePlanToHistory } from "@/lib/history";
import type { SavedPlan } from "@/lib/types";
import {
  INDUSTRY_OPTIONS,
  SUBSIDY_TYPES,
  isGenerateResult,
  isSubsidyType,
  type GenerateMode,
  type GenerateResult,
  type IndustryOption,
  type SubsidyType,
} from "@/lib/types";

const MIN_MEMO_LENGTH = 20;
const MIN_INDUSTRY_LENGTH = 2;
const MIN_LOCATION_LENGTH = 2;

const MEMO_PLACEHOLDER = `例）予約は電話のみで取りこぼしがある。地元野菜のランチが強み。POSと予約システムを入れて、平日の客数と客単価を上げたい。`;

const FIELD_CLASS =
  "mt-2 w-full rounded-[16px] border border-line bg-[#fbfaf7] px-4 py-3 text-[15px] leading-7 text-foreground outline-none placeholder:text-[#94a3b8] focus:border-accent focus:bg-white focus:ring-4 focus:ring-accent/20";

export function GeneratorForm() {
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const [location, setLocation] = useState("");
  const [industryPreset, setIndustryPreset] = useState<IndustryOption | "">(
    "",
  );
  const [industryCustom, setIndustryCustom] = useState("");
  const [subsidyType, setSubsidyType] = useState<SubsidyType | "">("");
  const [userMemo, setUserMemo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [mode, setMode] = useState<GenerateMode>("free");
  const [generatedMode, setGeneratedMode] = useState<GenerateMode>("free");
  const [saved, setSaved] = useState(false);
  const [saveWarning, setSaveWarning] = useState<string | null>(null);
  const [historyPlans, setHistoryPlans] = useState<SavedPlan[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const resultRef = useRef<HTMLElement | null>(null);
  const unlockedMode: GenerateMode = isPremium ? "premium" : "free";
  const industry =
    industryPreset === "その他" ? industryCustom.trim() : industryPreset;
  const canSubmit =
    location.trim().length >= MIN_LOCATION_LENGTH &&
    industry.length >= MIN_INDUSTRY_LENGTH &&
    Boolean(subsidyType) &&
    userMemo.trim().length >= MIN_MEMO_LENGTH;

  useEffect(() => {
    setMode(isPremium ? "premium" : "free");
  }, [isPremium]);

  useEffect(() => {
    if (!user) {
      setHistoryPlans(loadSavedPlans());
      return;
    }
    void fetchProposals()
      .then((data) => setHistoryPlans(data.proposals))
      .catch(() => setHistoryPlans([]));
  }, [user]);

  useEffect(() => {
    if (result) return;
    const fromCheckout =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("success") === "true";
    if (!isPremium && !fromCheckout) return;
    const latest = historyPlans[0];
    if (!latest?.snapshot || !isGenerateResult(latest.snapshot)) return;
    setResult(latest.snapshot);
    setGeneratedMode(latest.snapshot.mode ?? "premium");
    setLocation(latest.location);
    if ((INDUSTRY_OPTIONS as readonly string[]).includes(latest.industry)) {
      setIndustryPreset(latest.industry as IndustryOption);
      setIndustryCustom("");
    } else if (latest.industry) {
      setIndustryPreset("その他");
      setIndustryCustom(latest.industry);
    }
    if (isSubsidyType(latest.subsidyType)) {
      setSubsidyType(latest.subsidyType);
    }
    if (latest.userMemo) setUserMemo(latest.userMemo);
    setSaved(true);
  }, [historyPlans, isPremium, result]);

  async function persistPlan(
    plan: SavedPlan,
    replaceOldest = false,
    options?: { promptLogin?: boolean },
  ) {
    savePlanToHistory(plan);
    if (!user) {
      setSaved(true);
      setSaveWarning(
        options?.promptLogin
          ? "マイページへ保存するにはログインしてください。"
          : null,
      );
      setHistoryPlans(loadSavedPlans());
      return true;
    }
    const result = await saveProposalToAccount(plan, replaceOldest);
    if (result.ok) {
      setSaved(true);
      setSaveWarning(null);
      setHistoryPlans(result.proposals);
      return true;
    }
    if ("limitReached" in result && result.limitReached) {
      setSaved(false);
      setSaveWarning(LIMIT_MESSAGE);
      return false;
    }
    setSaved(false);
    setSaveWarning(result.error);
    return false;
  }

  async function generate() {
    setError(null);

    if (location.trim().length < MIN_LOCATION_LENGTH) {
      setError("対象地域を入力してください。例：三重県朝日町");
      return;
    }
    if (industry.length < MIN_INDUSTRY_LENGTH) {
      setError("業種を選択するか、入力してください。");
      return;
    }
    if (!subsidyType) {
      setError("申請したい補助金を選択してください。");
      return;
    }
    if (userMemo.trim().length < MIN_MEMO_LENGTH) {
      setError(
        "事業メモをもう少し詳しく書いてください。課題・強み・導入したい内容があると精度が上がります。",
      );
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: location.trim(),
          industry,
          subsidyType,
          userMemo: userMemo.trim(),
          mode: "premium",
          savedPlans: historyPlans.map((item) => ({
            title: item.title,
            subsidyType: item.subsidyType,
            expenseItems: item.expenseItems,
          })),
        }),
      });
      const data = (await response.json()) as GenerateResult & {
        error?: string;
        step?: string;
        detail?: string;
        model?: string;
      };
      if (!response.ok) {
        const parts = [
          data.error || "生成に失敗しました。",
          data.step ? `（${data.step}）` : "",
          data.detail ? `\n${data.detail}` : "",
          data.model ? `\nモデル: ${data.model}` : "",
        ];
        throw new Error(parts.join(""));
      }
      if (!isGenerateResult(data)) {
        throw new Error("生成結果を取得できませんでした。");
      }

      // ★ Vercel Analyticsに作成実績イベントを送信
      track("application_created", {
        subsidyType,
        industry,
      });

      setResult(data);
      setGeneratedMode(data.mode ?? "premium");
      setSaveWarning(null);
      await persistPlan(
        resultToSavedPlan(data, {
          location: location.trim(),
          industry,
          subsidyType,
          userMemo: userMemo.trim(),
        }),
      );
      requestAnimationFrame(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "通信に失敗しました。時間をおいて再試行してください。",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void generate();
  }

  async function handleSave(replaceOldest = false) {
    if (!result || !subsidyType) return;
    await persistPlan(
      resultToSavedPlan(result, {
        location: location.trim(),
        industry,
        subsidyType,
        userMemo: userMemo.trim(),
      }),
      replaceOldest,
      { promptLogin: true },
    );
  }

  function handleModeChange(next: GenerateMode) {
    if (isPremium) {
      setMode("premium");
      return;
    }
    if (next === "premium") return;
    setMode("free");
  }

  return (
    <div id="generator" className="mx-auto w-full max-w-4xl scroll-mt-20">
      <form
        onSubmit={handleSubmit}
        className="card-luxury w-full rounded-[24px] border border-line bg-white p-5 sm:p-7"
      >
        <PlanCompare value={unlockedMode} onChange={handleModeChange} />

        <label
          htmlFor="location"
          className="mt-5 block text-[13px] font-semibold tracking-wide"
        >
          地域
        </label>
        <input
          id="location"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="例：三重県朝日町"
          autoComplete="address-level1"
          className={FIELD_CLASS}
        />

        <label
          htmlFor="industry"
          className="mt-6 block text-[13px] font-semibold tracking-wide"
        >
          業種
        </label>
        <select
          id="industry"
          value={industryPreset}
          onChange={(e) =>
            setIndustryPreset(e.target.value as IndustryOption | "")
          }
          className={FIELD_CLASS}
        >
          <option value="">選択してください</option>
          {INDUSTRY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {industryPreset === "その他" ? (
          <input
            id="industryCustom"
            type="text"
            value={industryCustom}
            onChange={(e) => setIndustryCustom(e.target.value)}
            placeholder="業種を入力（例：農業、宿泊業）"
            className={`mt-2 ${FIELD_CLASS}`}
          />
        ) : null}

        <label
          htmlFor="subsidyType"
          className="mt-6 block text-[13px] font-semibold tracking-wide"
        >
          申請したい補助金
        </label>
        <select
          id="subsidyType"
          value={subsidyType}
          onChange={(e) =>
            setSubsidyType(e.target.value as SubsidyType | "")
          }
          className={FIELD_CLASS}
        >
          <option value="">選択してください</option>
          {SUBSIDY_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <div className="mt-6 flex items-end justify-between gap-3">
          <label
            htmlFor="userMemo"
            className="block text-[13px] font-semibold tracking-wide"
          >
            事業メモ
          </label>
          <span className="text-[12px] text-muted">
            {userMemo.trim().length}文字
          </span>
        </div>
        <textarea
          id="userMemo"
          value={userMemo}
          onChange={(e) => setUserMemo(e.target.value)}
          rows={6}
          placeholder={MEMO_PLACEHOLDER}
          className={`mt-2 w-full resize-y ${FIELD_CLASS}`}
        />
        <p className="mt-2 text-[12px] leading-5 text-muted">
          100文字程度の雑多なメモで構いません。課題・強み・買いたいものが入っていると精度が上がります。
        </p>

        <button
          type="submit"
          disabled={loading || !canSubmit}
          aria-busy={loading}
          className={`mt-7 flex min-h-12 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#D97706] to-[#F59E0B] px-4 py-3 text-[15px] font-bold text-[#0F172A] shadow-[0_10px_24px_rgba(217,119,6,0.32)] transition hover:from-[#B45309] hover:to-[#D97706] disabled:cursor-not-allowed ${
            loading ? "opacity-100" : "disabled:opacity-55"
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2" aria-live="polite">
              <Spinner />
              作成中...
            </span>
          ) : (
            "申請書の骨子を作成する"
          )}
        </button>

        <GeneratingProgress loading={loading} />

        {error ? (
          <p
            role="alert"
            className="mt-4 whitespace-pre-wrap rounded-2xl bg-[#fff2f2] px-4 py-3 text-[13px] leading-6 text-[#c41e3a]"
          >
            {error}
          </p>
        ) : null}
      </form>

      {result ? (
        <section ref={resultRef} className="mt-10">
          <ResultView
            result={result}
            mode={unlockedMode}
            generatedMode={generatedMode}
            context={{
              location: location.trim(),
              industry,
              subsidyType,
            }}
            saved={saved}
            saveWarning={saveWarning}
            onSave={() => void handleSave(false)}
            onReplaceOldest={() => void handleSave(true)}
          />
        </section>
      ) : null}

      {result ? (
        <MeisterChatDock
          open={chatOpen}
          onOpenChange={setChatOpen}
          unlocked={unlockedMode === "premium"}
          context={{
            location: location.trim(),
            industry,
            subsidyType,
            result,
          }}
        />
      ) : null}
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
    >
      <circle
        cx="10"
        cy="10"
        r="7"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="2"
      />
      <path
        d="M17 10a7 7 0 0 0-7-7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}