"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabaseClient";
import { completeAppSession, type AppSessionPayload } from "@/lib/auth-client";
import { translateAuthError } from "@/lib/auth-errors";

export function PasswordResetModal({
  open,
  onClose,
  onCompleted,
}: {
  open: boolean;
  onClose: () => void;
  onCompleted: (user: AppSessionPayload) => void;
}) {
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPassword("");
    setPasswordConfirm("");
    setBusy(false);
    setError(null);
    setDone(false);
  }, [open]);

  if (!open) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("パスワードは6文字以上で入力してください");
      return;
    }
    if (password !== passwordConfirm) {
      setError("パスワード（確認）が一致しません。");
      return;
    }
    setBusy(true);
    try {
      const { error: authError } = await supabase.auth.updateUser({ password });
      if (authError) throw authError;
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) {
        const session = await completeAppSession(token, false);
        if (session.email) onCompleted(session);
      }
      setDone(true);
      window.setTimeout(() => onClose(), 800);
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="password-reset-title"
      className="fixed inset-0 z-[96] flex items-center justify-center bg-[#0F172A]/50 px-5"
      onClick={onClose}
    >
      <form
        onSubmit={(e) => void submit(e)}
        onClick={(e) => e.stopPropagation()}
        className="card-luxury w-full max-w-[420px] rounded-[24px] border border-line bg-white p-6 sm:p-7"
      >
        <h3
          id="password-reset-title"
          className="text-[20px] font-extrabold tracking-tight text-brand"
        >
          新しいパスワードを設定
        </h3>
        {done ? (
          <p className="mt-3 text-[14px] font-semibold text-accent">
            パスワードを更新しました。ログインを継続します。
          </p>
        ) : (
          <>
            <p className="mt-2 text-[14px] leading-7 text-muted">
              メールの確認が完了しました。この画面で新しいパスワードを入力してください。
            </p>
            {error ? <p className="mt-3 text-[13px] text-[#c41e3a]">{error}</p> : null}
            <label className="mt-4 block text-[13px] font-semibold">
              新しいパスワード
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full rounded-[16px] border border-line bg-[#fbfaf7] px-4 py-3 text-[15px] outline-none focus:border-accent focus:bg-white focus:ring-4 focus:ring-accent/20"
              />
            </label>
            <label className="mt-4 block text-[13px] font-semibold">
              パスワード（確認）
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className="mt-2 w-full rounded-[16px] border border-line bg-[#fbfaf7] px-4 py-3 text-[15px] outline-none focus:border-accent focus:bg-white focus:ring-4 focus:ring-accent/20"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#D97706] to-[#F59E0B] px-4 text-[14px] font-bold text-[#0F172A] disabled:opacity-60"
            >
              {busy ? "更新中..." : "パスワードを更新する"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
