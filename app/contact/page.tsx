import type { Metadata } from "next";
import { ContactForm } from "@/components/ContactForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "お問い合わせ | AI補助金マイスター",
  description: "AI補助金マイスターへのお問い合わせフォームです。",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
        お問い合わせ
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        サービスに関するご質問、所在地等の開示請求は、以下のフォームよりお送りください。
      </p>
      <div className="mt-8">
        <ContactForm />
      </div>
    </div>
  );
}