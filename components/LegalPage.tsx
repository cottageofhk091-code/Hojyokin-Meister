import Link from "next/link";
import type { ReactNode } from "react";

export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-[720px] flex-1 px-5 pb-16 pt-8">
      <Link
        href="/"
        className="inline-flex items-center text-[14px] font-medium text-accent hover:underline"
      >
        ← ホームへ戻る
      </Link>
      <article className="card-luxury mt-5 rounded-[24px] border border-line bg-white p-5 sm:p-8">
        <h1 className="text-[24px] font-extrabold leading-tight tracking-tight text-brand sm:text-[28px]">
          {title}
        </h1>
        <div className="mt-4 h-px w-16 bg-gradient-to-r from-[#D97706] to-[#F59E0B]" />
        <div className="mt-6 space-y-6 text-[14px] leading-7 text-foreground [&_h2]:text-[16px] [&_h2]:font-semibold [&_h2]:tracking-tight [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5">
          {children}
        </div>
      </article>
    </main>
  );
}
