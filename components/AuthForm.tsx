"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "@/components/AuthProvider";
import { sanitizeOtpInput } from "@/lib/auth/otp";

export function AuthForm({ onSuccess }: { onSuccess?: () => void }) {
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function requestCode(normalized: string) {
    const response = await fetch("/api/auth/send-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalized }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      throw new Error(data.error || "確認コードを送信できませんでした。");
    }
  }

  async function sendCode(event: FormEvent) {
    event.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!normalized.includes("@")) {
      setError("メールアドレスを入力してください。");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await requestCode(normalized);
      setEmail(normalized);
      setStep("code");
      setInfo("6桁の確認コードをメールに送信しました。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "送信に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    setLoading(true);
    setError(null);
    try {
      await requestCode(email.trim().toLowerCase());
      setInfo("確認コードを再送信しました。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "再送信に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    const token = sanitizeOtpInput(code);
    if (!/^\d{6}$/.test(token)) {
      setError("6桁の確認コードを入力してください。");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: token }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "確認コードが正しくありません。");
      }
      await refresh();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ログインに失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  if (step === "email") {
    return (
      <form onSubmit={sendCode} className="space-y-4">
        <div>
          <label htmlFor="auth-email" className="block text-[13px] font-semibold">
            メールアドレス
          </label>
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-2 w-full rounded-[16px] border border-line bg-[#fbfaf7] px-4 py-3 text-[15px] outline-none focus:border-accent focus:bg-white focus:ring-4 focus:ring-accent/20"
          />
        </div>
        {error ? <p className="text-[13px] text-[#c41e3a]">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#D97706] to-[#F59E0B] px-4 text-[14px] font-bold text-[#0F172A] disabled:opacity-60"
        >
          {loading ? "送信中..." : "確認コードを送る"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={verifyCode} className="space-y-4">
      <p className="text-[13px] leading-6 text-muted">
        {email} に送った6桁のコードを入力してください。
      </p>
      <div>
        <label htmlFor="auth-code" className="block text-[13px] font-semibold">
          確認コード
        </label>
        <input
          id="auth-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(sanitizeOtpInput(e.target.value))}
          placeholder="123456"
          className="mt-2 w-full rounded-[16px] border border-line bg-[#fbfaf7] px-4 py-3 text-center text-[22px] tracking-[0.4em] outline-none focus:border-accent focus:bg-white focus:ring-4 focus:ring-accent/20"
        />
        <p className="mt-2 text-center text-[12px] leading-5 text-muted">
          ※半角数字で入力してください
        </p>
      </div>
      {info ? <p className="text-[13px] text-accent">{info}</p> : null}
      {error ? <p className="text-[13px] text-[#c41e3a]">{error}</p> : null}
      <button
        type="submit"
        disabled={loading || code.length !== 6}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#D97706] to-[#F59E0B] px-4 text-[14px] font-bold text-[#0F172A] disabled:opacity-60"
      >
        {loading ? "確認中..." : "ログインする"}
      </button>
      <button
        type="button"
        disabled={loading}
        className="w-full text-[12px] font-semibold text-muted hover:text-accent disabled:opacity-60"
        onClick={() => void resendCode()}
      >
        確認コードを再送信する
      </button>
      <button
        type="button"
        className="w-full text-[12px] font-semibold text-muted hover:text-accent"
        onClick={() => {
          setStep("email");
          setCode("");
          setError(null);
          setInfo(null);
        }}
      >
        メールアドレスをやり直す
      </button>
    </form>
  );
}
