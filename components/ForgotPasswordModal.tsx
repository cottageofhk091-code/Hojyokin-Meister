"use client";

import { useEffect, useState, type FormEvent } from "react";
import { markPendingRecovery } from "@/lib/auth-client";
import { translateAuthError } from "@/lib/auth-errors";

export function ForgotPasswordModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setEmail("");
    setBusy(false);
    setError(null);
    setSent(false);
    setInfo(null);
  }, [open]);

  if (!open) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) throw new Error(data.error || "パスワード再設定メールの送信に失敗しました");
      markPendingRecovery(email);
      setSent(true);
      setInfo(
        data.message ||
          "パスワード再設定用のメールを送りました。メール内のボタンから新しいパスワードを設定してください。",
      );
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="forgot-password-title"
      className="fixed inset-0 z-[96] flex items-center justify-center bg-[#0F172A]/50 px-5"
      onClick={onClose}
    >
      <form
        onSubmit={(e) => void submit(e)}
        onClick={(e) => e.stopPropagation()}
        className="card-luxury w-full max-w-[420px] rounded-[24px] border border-line bg-white p-6 sm:p-7"
      >
        <h3
          id="forgot-password-title"
          className="text-[20px] font-extrabold tracking-tight text-brand"
        >
          パスワード再設定
        </h3>
        {sent ? (
          <p className="mt-3 text-[14px] leading-7 font-semibold text-muted">{info}</p>
        ) : (
          <>
            <p className="mt-2 text-[14px] leading-7 text-muted">
              登録済みのメールアドレスを入力してください。再設定用のリンクをお送りします。
            </p>
            {error ? <p className="mt-3 text-[13px] text-[#c41e3a]">{error}</p> : null}
            <label className="mt-4 block text-[13px] font-semibold">
              メールアドレス
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-2 w-full rounded-[16px] border border-line bg-[#fbfaf7] px-4 py-3 text-[15px] outline-none focus:border-accent focus:bg-white focus:ring-4 focus:ring-accent/20"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#D97706] to-[#F59E0B] px-4 text-[14px] font-bold text-[#0F172A] disabled:opacity-60"
            >
              {busy ? "送信中..." : "再設定メールを送る"}
            </button>
          </>
        )}
        <button
          type="button"
          onClick={onClose}
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-line px-4 text-[14px] font-bold"
        >
          {sent ? "閉じる" : "キャンセル"}
        </button>
      </form>
    </div>
  );
}
