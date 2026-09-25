"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabaseClient";
import { completeAppSession, notifyPasswordRecovery } from "@/lib/auth-client";
import { translateAuthError } from "@/lib/auth-errors";
import { SITE_NAME } from "@/lib/site";
import { useAuth } from "@/components/AuthProvider";

const REDIRECT_HINT =
  "Supabase の Authentication → URL Configuration で Site URL と Redirect URLs に https://hojyokin-meister-1.vercel.app/auth/reset-password および https://hojyokin-meister-1.vercel.app/** が含まれているか確認してください。";

const SESSION_CACHE_KEY = "aim_recovery_session";

type CachedSession = { access_token: string; refresh_token: string };

let recoveryBootstrap: Promise<void> | null = null;

function readCachedSession(): CachedSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedSession;
    if (parsed.access_token && parsed.refresh_token) return parsed;
  } catch {
    // ignore
  }
  return null;
}

async function applyRecoverySession(tokens: CachedSession) {
  sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(tokens));
  const { error } = await supabase.auth.setSession(tokens);
  if (error) throw error;
}

async function bootstrapRecoverySession() {
  const existing = await supabase.auth.getSession();
  if (existing.data.session) return;

  const cached = readCachedSession();
  if (cached) {
    await applyRecoverySession(cached);
    return;
  }

  const url = new URL(window.location.href);
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
  const tokenHash =
    url.searchParams.get("token_hash") || hashParams.get("token_hash");
  const typeRaw =
    url.searchParams.get("type") || hashParams.get("type") || "recovery";
  const code = url.searchParams.get("code") || hashParams.get("code");
  const accessToken =
    hashParams.get("access_token") || url.searchParams.get("access_token");
  const refreshToken =
    hashParams.get("refresh_token") || url.searchParams.get("refresh_token");

  if (url.searchParams.get("error") || hashParams.get("error")) {
    const reason =
      url.searchParams.get("error_description") ||
      hashParams.get("error_description") ||
      url.searchParams.get("error") ||
      "確認リンクの検証に失敗しました。";
    throw new Error(reason);
  }

  if (accessToken && refreshToken) {
    await applyRecoverySession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  } else if (tokenHash) {
    const res = await fetch("/api/auth/verify-recovery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token_hash: tokenHash,
        type: typeRaw || "recovery",
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      access_token?: string;
      refresh_token?: string;
    };
    if (!res.ok || !data.access_token || !data.refresh_token) {
      console.error("[auth.reset-password] verify-recovery:", data.error);
      throw new Error(data.error || "確認リンクの検証に失敗しました。");
    }
    await applyRecoverySession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[auth.reset-password] exchangeCodeForSession:", error.message, error);
      throw error;
    }
  } else {
    throw new Error("リンクが無効か、有効期限が切れています。");
  }

  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    throw new Error("再設定用セッションを確立できませんでした。");
  }
  window.history.replaceState({}, "", "/auth/reset-password");
}

export default function ResetPasswordPage() {
  const { applySession } = useAuth();
  const [status, setStatus] = useState<"working" | "form" | "done" | "error">("working");
  const [message, setMessage] = useState("再設定リンクを確認しています...");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!recoveryBootstrap) {
      recoveryBootstrap = bootstrapRecoverySession().catch((err) => {
        recoveryBootstrap = null;
        throw err;
      });
    }

    void recoveryBootstrap
      .then(() => {
        if (cancelled) return;
        notifyPasswordRecovery();
        setStatus("form");
        setMessage("");
      })
      .catch((err) => {
        if (cancelled) return;
        const raw = err instanceof Error ? err.message : String(err);
        console.error("[auth.reset-password] failed:", raw, err);
        setStatus("error");
        setMessage(`${translateAuthError(err)}\n\n${REDIRECT_HINT}`);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password.length < 6) {
      setMessage("パスワードは6文字以上で入力してください");
      return;
    }
    if (password !== passwordConfirm) {
      setMessage("パスワード（確認）が一致しません。");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) {
        const session = await completeAppSession(token, false);
        if (session.email) applySession(session);
      }
      try {
        sessionStorage.removeItem(SESSION_CACHE_KEY);
      } catch {
        // ignore
      }
      setStatus("done");
      setMessage("パスワードを更新しました。トップページでログイン済みです。");
      window.setTimeout(() => {
        window.location.replace("/");
      }, 900);
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      console.error("[auth.reset-password] update:", raw, err);
      setMessage(translateAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-5 py-16">
      <section className="card-luxury w-full max-w-[480px] rounded-[24px] border border-line bg-white p-8">
        <p className="text-center text-[11px] font-semibold tracking-[0.2em] text-accent">
          {SITE_NAME}
        </p>
        <h1 className="mt-2 text-center text-[22px] font-extrabold leading-8 tracking-tight text-brand">
          {status === "working"
            ? "確認中"
            : status === "error"
              ? "確認できませんでした"
              : status === "done"
                ? "更新しました"
                : "新しいパスワードを設定"}
        </h1>

        {status === "working" || status === "error" || status === "done" ? (
          <p className="mt-4 text-center text-[15px] leading-7 text-muted whitespace-pre-wrap">
            {message}
          </p>
        ) : (
          <form onSubmit={(e) => void submit(e)} className="mt-4 space-y-4">
            <p className="text-[14px] leading-7 text-muted">
              メールの確認が完了しました。新しいパスワードを入力して保存してください。
            </p>
            {message ? <p className="text-[13px] text-[#c41e3a]">{message}</p> : null}
            <label className="block text-[13px] font-semibold">
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
            <label className="block text-[13px] font-semibold">
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
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#D97706] to-[#F59E0B] px-4 text-[14px] font-bold text-[#0F172A] disabled:opacity-60"
            >
              {busy ? "更新中..." : "パスワードを保存する"}
            </button>
          </form>
        )}

        {status === "error" ? (
          <a
            href="/login?mode=forgot"
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full border border-line px-5 text-[14px] font-bold"
          >
            再設定メールを送り直す
          </a>
        ) : null}
      </section>
    </main>
  );
}
