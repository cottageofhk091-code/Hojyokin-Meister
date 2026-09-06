"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export default function SuccessPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-16 text-center">
      <CheckCircle2 className="h-16 w-16 text-emerald-500" />
      <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">
        申請書の骨子が完成しました！
      </h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        作成されたデータは画面下部およびマイページ（保存履歴）からご確認いただけます。
      </p>
      <Link
        href="/"
        className="mt-8 rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
      >
        トップページに戻る
      </Link>
    </div>
  );
}