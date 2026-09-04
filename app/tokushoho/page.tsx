import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { PREMIUM_PRICE_TEXT, PREMIUM_PRICE_WITH_TAX } from "@/lib/site";

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記",
};

const ROWS: Array<{ term: string; description: ReactNode }> = [
  { term: "販売事業者名（屋号）", description: "Nomad Flow Lab" },
  { term: "運営責任者", description: "Hiroki Matsushita" },
  {
    term: "所在地",
    description: (
      <>
        <p>
          請求があった場合には遅滞なく開示します。お問い合わせフォームよりご請求ください。
        </p>
        <p className="mt-2 text-[13px] leading-6 text-muted">
          ※個人事業・小規模運営での特商法ガイドラインに基づく表記です。
        </p>
      </>
    ),
  },
  {
    term: "連絡先",
    description: (
      <>
        お問い合わせは、
        <Link href="/contact" className="font-medium text-accent hover:underline">
          お問い合わせフォーム
        </Link>
        よりご連絡ください。所在地・電話番号についても、ご請求時に遅滞なく開示します。
      </>
    ),
  },
  {
    term: "販売価格",
    description:
      `サービス購入画面に表示します（例: プレミアム ${PREMIUM_PRICE_TEXT}）。表示価格は${PREMIUM_PRICE_WITH_TAX}です。`,
  },
  {
    term: "商品代金以外の必要料金",
    description: "インターネット接続料金および通信料（お客様負担）",
  },
  {
    term: "支払方法",
    description: "クレジットカード決済（Stripe等）",
  },
  {
    term: "代金の支払時期",
    description: "ご注文時に即時決済されます。",
  },
  {
    term: "商品の引き渡し時期",
    description: "決済完了後、即時利用可能となります。",
  },
  {
    term: "返品・キャンセルについて",
    description:
      "デジタルコンテンツの特性上、決済完了後の返金・キャンセルはお受けできません。",
  },
];

export default function TokushohoPage() {
  return (
    <LegalPage title="特定商取引法に基づく表記">
      <dl className="divide-y divide-line rounded-2xl border border-line">
        {ROWS.map((row) => (
          <div
            key={row.term}
            className="grid gap-1 px-4 py-4 sm:grid-cols-[12.5rem_1fr] sm:gap-4"
          >
            <dt className="text-[13px] font-semibold text-muted">{row.term}</dt>
            <dd>{row.description}</dd>
          </div>
        ))}
      </dl>
    </LegalPage>
  );
}
