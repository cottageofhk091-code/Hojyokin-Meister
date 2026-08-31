"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CopyButton } from "@/components/CopyButton";
import { PremiumLockCard } from "@/components/PremiumLockCard";
import {
  formatApplicationDocument,
  formatExpenseMarkdown,
  formatPlanDetailsMarkdown,
  formatPlanOverviewMarkdown,
} from "@/lib/format-application";
import type { GenerateMode, GenerateResult } from "@/lib/types";

export function ResultView({
  result,
  mode,
  context,
  saved,
  onSave,
}: {
  result: GenerateResult;
  mode: GenerateMode;
  generatedMode: GenerateMode;
  context: {
    location: string;
    industry: string;
    subsidyType: string;
  };
  saved: boolean;
  onSave: () => void;
}) {
  const premiumUnlocked = mode === "premium";
  const copyText = premiumUnlocked
    ? formatApplicationDocument(result)
    : formatPlanOverviewMarkdown(result);
  const main = result.recommendations.find((item) => item.isMain);
  const combined = result.recommendations
    .filter((item) => !item.isMain)
    .map((item) => item.name)
    .join(" / ");

  const mapMarkdown = `## おすすめ補助金・助成金マップ

- **メイン候補**: 【${main?.name ?? "未設定"}】
- **併用検討**: 【${combined || "IT導入補助金 / 業務改善助成金 / 自治体独自補助金"}】

${result.recommendations
  .map(
    (item) =>
      `- **${item.isMain ? "メイン" : item.category}** 【${item.name}】: ${item.summary}`,
  )
  .join("\n")}`;

  const adviceMarkdown = `## 基本アドバイス

### 追記すべき数値
${result.advice.numbers.map((item) => `- ${item}`).join("\n")}

### 準備書類
${result.advice.documents.map((item) => `- ${item}`).join("\n")}`;

  return (
    <div className="space-y-5 pb-24">
      <div className="card-luxury rounded-[24px] border border-line bg-white p-5 sm:p-6">
        <p className="text-[12px] font-semibold tracking-wide text-accent">
          {premiumUnlocked ? "完全版" : "プレビュー"} / {context.location} / {context.industry}
        </p>
        <h2 className="mt-1 text-[18px] font-semibold tracking-tight">
          {result.plan.title}
        </h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <CopyButton
            value={copyText}
            label={premiumUnlocked ? "申請書をコピペする" : "概要をコピペする"}
            variant="primary"
          />
          <button
            type="button"
            onClick={onSave}
            disabled={saved}
            className="min-h-9 rounded-full border border-line px-4 text-[12px] font-semibold hover:bg-[#f7f1e6] disabled:opacity-70 sm:text-[13px]"
          >
            {saved ? "マイページに保存済み" : "マイページに保存する"}
          </button>
          <Link
            href="/mypage"
            className="inline-flex min-h-9 items-center rounded-full bg-[#0F172A] px-4 text-[12px] font-semibold text-[#FDE68A] sm:text-[13px]"
          >
            申請履歴を見る
          </Link>
        </div>
      </div>

      <section className="card-luxury rounded-[24px] border border-line bg-white p-5 sm:p-6">
        <MarkdownBody markdown={mapMarkdown} />
      </section>

      <section className="card-luxury rounded-[24px] border border-line bg-white p-5 sm:p-6">
        <h2 className="mb-4 text-[18px] font-semibold tracking-tight">
          事業計画書（申請書）下書き
        </h2>
        <MarkdownBody markdown={formatPlanOverviewMarkdown(result)} />

        <div className="relative mt-6 min-h-[320px]">
          <div
            className={
              premiumUnlocked
                ? ""
                : "pointer-events-none select-none blur-sm"
            }
          >
            <MarkdownBody markdown={formatPlanDetailsMarkdown(result)} />
            <div className="mt-4">
              <MarkdownBody markdown={formatExpenseMarkdown(result)} />
            </div>
          </div>
          {!premiumUnlocked ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/25 px-4 py-6 backdrop-blur-[2px]">
              <PremiumLockCard />
            </div>
          ) : null}
        </div>
      </section>

      <section className="card-luxury rounded-[24px] border border-line bg-white p-5 sm:p-6">
        <MarkdownBody markdown={adviceMarkdown} />
      </section>
    </div>
  );
}

function MarkdownBody({ markdown }: { markdown: string }) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children }) => (
            <div className="mt-3 overflow-x-auto">
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
