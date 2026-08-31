"use client";

import { useState } from "react";
import type { FormEvent } from "react";

const fieldClass =
  "mt-2 w-full rounded-[16px] border border-line bg-[#fbfaf7] px-4 py-3 text-[15px] leading-7 text-foreground outline-none placeholder:text-[#94a3b8] focus:border-accent focus:bg-white focus:ring-4 focus:ring-accent/20";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });
      if (!response.ok) {
        throw new Error("送信に失敗しました。");
      }
      setSubmitted(true);
    } catch {
      setError("送信に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl bg-[#f7f1e6] px-4 py-5">
        <p className="text-[15px] font-semibold">
          お問い合わせを受け付けました（デモ）
        </p>
        <p className="mt-2 text-[14px] leading-7 text-muted">
          現時点ではメール送信は行っていません。本番公開後に、運営よりご連絡する想定です。
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="contact-name" className="block text-[13px] font-semibold">
          お名前
        </label>
        <input
          id="contact-name"
          name="name"
          type="text"
          required
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={fieldClass}
        />
      </div>
      <div>
        <label htmlFor="contact-email" className="block text-[13px] font-semibold">
          メールアドレス
        </label>
        <input
          id="contact-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={fieldClass}
        />
      </div>
      <div>
        <label htmlFor="contact-subject" className="block text-[13px] font-semibold">
          件名
        </label>
        <input
          id="contact-subject"
          name="subject"
          type="text"
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className={fieldClass}
        />
      </div>
      <div>
        <label htmlFor="contact-message" className="block text-[13px] font-semibold">
          お問い合わせ内容
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={7}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={`${fieldClass} resize-y`}
        />
      </div>
      {error ? (
        <p role="alert" className="rounded-2xl bg-[#fff2f2] px-4 py-3 text-[13px] text-[#c41e3a]">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={submitting}
        className="flex h-12 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#D97706] to-[#F59E0B] text-[15px] font-bold text-[#0F172A] shadow-[0_8px_20px_rgba(217,119,6,0.28)] hover:from-[#B45309] hover:to-[#D97706] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "送信しています…" : "送信する"}
      </button>
      <p className="text-[12px] leading-5 text-muted">
        現時点ではデモ受付です。個人情報の取扱いはプライバシーポリシーをご確認ください。
      </p>
    </form>
  );
}
