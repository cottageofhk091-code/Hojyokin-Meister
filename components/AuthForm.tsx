"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import {
  completeAppSession,
  markPendingRecovery,
  markPendingSignup,
} from "@/lib/auth-client";
import { translateAuthError } from "@/lib/auth-errors";

const INPUT_CLASS =
  "mt-2 w-full rounded-[16px] border border-line bg-[#fbfaf7] px-4 py-3 text-[15px] outline-none focus:border-accent focus:bg-white focus:ring-4 focus:ring-accent/20";

export function AuthForm({
  onSuccess,
  initialMode = "login",
}: {
  onSuccess?: () => void;
  initialMode?: "login" | "signup" | "forgot";
}) {
  const { applySession, refresh } = useAuth();
  const [mode, setMode] = useState<"login" | "signup" | "forgot" | "sent">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) throw authError;
      const token = data.session?.access_token;
      if (!token) {
        throw new Error(
          "メールアドレスの確認が完了していません。確認メール内のリンクをクリックしてください。",
        );
      }
      applySession(await completeAppSession(token, false));
      await refresh();
      onSuccess?.();
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      if (password.length < 6) throw new Error("パスワードは6文字以上で入力してください");
      if (password !== passwordConfirm) throw new Error("パスワード（確認）が一致しません。");
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) throw new Error(data.error || "登録に失敗しました");
      markPendingSignup(email);
      setMode("sent");
      setInfo(
        data.message ||
          "確認メールを送りました。メール内の確認ボタンをクリックしてください。この画面は開いたままお待ちください。",
      );
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) throw new Error(data.error || "パスワード再設定メールの送信に失敗しました");
      markPendingRecovery(email);
      setMode("sent");
      setInfo(
        data.message ||
          "パスワード再設定用のメールを送りました。メール内のボタンを押したあと、この画面に戻って新しいパスワードを入力してください。このタブは開いたままお待ちください。",
      );
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  const title =
    mode === "signup"
      ? "新規登録"
      : mode === "forgot"
        ? "パスワード再設定"
        : mode === "sent"
          ? "メールを確認してください"
          : "ログイン";

  return (
    <div className="space-y-4">
      <h2 className="text-[16px] font-extrabold tracking-tight text-brand">{title}</h2>
      <p className="text-[13px] leading-6 text-muted">
        {mode === "signup"
          ? "メールアドレスとパスワードで登録します。登録後、確認メールのリンクをクリックすると完了します。"
          : mode === "forgot"
            ? "登録済みのメールアドレスを入力してください。再設定用のリンクをお送りします。確認後、この画面で新しいパスワードを入力できます。"
            : mode === "sent"
              ? info
              : "メールアドレスとパスワードでログインするか、新規登録してください。"}
      </p>
      {error ? <p className="text-[13px] text-[#c41e3a]">{error}</p> : null}

      {mode === "login" ? (
        <form onSubmit={(e) => void handleLogin(e)} className="space-y-4">
          <div>
            <label htmlFor="auth-email" className="block text-[13px] font-semibold">
              メールアドレス
            </label>
            <input
              id="auth-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor="auth-password" className="block text-[13px] font-semibold">
              パスワード
            </label>
            <input
              id="auth-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6文字以上"
              className={INPUT_CLASS}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#D97706] to-[#F59E0B] px-4 text-[14px] font-bold text-[#0F172A] disabled:opacity-60"
          >
            {loading ? "ログイン中..." : "ログイン"}
          </button>
          <button
            type="button"
            className="w-full text-left text-[12px] font-semibold text-muted hover:text-accent"
            onClick={() => {
              setMode("forgot");
              setError(null);
            }}
          >
            パスワードをお忘れの方はこちら
          </button>
          <button
            type="button"
            className="w-full text-[12px] font-semibold text-muted hover:text-accent"
            onClick={() => {
              setMode("signup");
              setError(null);
            }}
          >
            新規登録はこちら
          </button>
        </form>
      ) : null}

      {mode === "signup" ? (
        <form onSubmit={(e) => void handleSignup(e)} className="space-y-4">
          <div>
            <label htmlFor="signup-email" className="block text-[13px] font-semibold">
              メールアドレス
            </label>
            <input
              id="signup-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor="signup-password" className="block text-[13px] font-semibold">
              パスワード
            </label>
            <input
              id="signup-password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6文字以上"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor="signup-password-confirm" className="block text-[13px] font-semibold">
              パスワード（確認）
            </label>
            <input
              id="signup-password-confirm"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="もう一度入力"
              className={INPUT_CLASS}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#D97706] to-[#F59E0B] px-4 text-[14px] font-bold text-[#0F172A] disabled:opacity-60"
          >
            {loading ? "登録中..." : "登録する"}
          </button>
          <button
            type="button"
            className="w-full text-[12px] font-semibold text-muted hover:text-accent"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
          >
            ログインに戻る
          </button>
        </form>
      ) : null}

      {mode === "forgot" ? (
        <form onSubmit={(e) => void handleForgot(e)} className="space-y-4">
          <div>
            <label htmlFor="forgot-email" className="block text-[13px] font-semibold">
              メールアドレス
            </label>
            <input
              id="forgot-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={INPUT_CLASS}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#D97706] to-[#F59E0B] px-4 text-[14px] font-bold text-[#0F172A] disabled:opacity-60"
          >
            {loading ? "送信中..." : "再設定メールを送る"}
          </button>
          <button
            type="button"
            className="w-full text-[12px] font-semibold text-muted hover:text-accent"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
          >
            ログインに戻る
          </button>
        </form>
      ) : null}

      {mode === "sent" ? (
        <button
          type="button"
          className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-line px-4 text-[14px] font-bold"
          onClick={() => {
            setMode("login");
            setError(null);
            setInfo(null);
          }}
        >
          ログイン画面に戻る
        </button>
      ) : null}
    </div>
  );
}
