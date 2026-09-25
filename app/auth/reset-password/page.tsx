"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { completeAppSession, notifyPasswordRecovery } from "@/lib/auth-client";
import { translateAuthError } from "@/lib/auth-errors";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase-env";
import { SITE_NAME } from "@/lib/site";
import { useAuth } from "@/components/AuthProvider";

const REDIRECT_HINT =
  "Supabase の Authentication → URL Configuration で Redirect URLs に https://hojyokin-meister-1.vercel.app/auth/reset-password と https://hojyokin-meister-1.vercel.app/** を追加してください。";

function mergeSearchParams(nextParams: URLSearchParams | null): URLSearchParams {
  const merged = new URLSearchParams();
  if (typeof window !== "undefined") {
    const query = new URLSearchParams(window.location.search);
    const hashRaw = window.location.hash.replace(/^#/, "");
    const hashQuery = hashRaw.includes("?")
      ? hashRaw.slice(hashRaw.indexOf("?") + 1)
      : hashRaw;
    const hash = new URLSearchParams(hashQuery);
    for (const src of [query, hash]) {
      src.forEach((value, key) => {
        if (value && !merged.get(key)) merged.set(key, value);
      });
    }
  }
  nextParams?.forEach((value, key) => {
    if (value && !merged.get(key)) merged.set(key, value);
  });
  return merged;
}

function formatVerifyError(error: unknown): string {
  const rec =
    error && typeof error === "object"
      ? (error as { message?: unknown; code?: unknown; status?: unknown; name?: unknown })
      : null;
  const parts = [
    rec && typeof rec.message === "string" ? rec.message : null,
    rec && typeof rec.code === "string" ? `code=${rec.code}` : null,
    rec && rec.status != null ? `status=${String(rec.status)}` : null,
  ].filter(Boolean);
  if (parts.length > 0) return parts.join(" / ");
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

let implicitClient: ReturnType<typeof createClient> | null = null;

function getImplicitClient() {
  if (implicitClient) return implicitClient;
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) return supabase;
  implicitClient = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "implicit",
    },
  });
  return implicitClient;
}

function ResetPasswordInner() {
  const nextSearchParams = useSearchParams();
  const { applySession } = useAuth();
  const [status, setStatus] = useState<"working" | "form" | "done" | "error">("working");
  const [message, setMessage] = useState("再設定リンクを確認しています...");
  const [detail, setDetail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const searchParams = mergeSearchParams(nextSearchParams);
        const token_hash =
          searchParams.get("token_hash") ||
          searchParams.get("token") ||
          searchParams.get("code");
        const type = searchParams.get("type") || "recovery";
        const accessToken = searchParams.get("access_token");
        const refreshToken = searchParams.get("refresh_token");

        console.info("[auth.reset-password] params", {
          has_token_hash: Boolean(searchParams.get("token_hash")),
          has_token: Boolean(searchParams.get("token")),
          has_code: Boolean(searchParams.get("code")),
          type,
          href: typeof window !== "undefined" ? window.location.href : "",
        });

        if (searchParams.get("error")) {
          throw new Error(
            searchParams.get("error_description") ||
              searchParams.get("error") ||
              "確認リンクの検証に失敗しました。",
          );
        }

        const auth = getImplicitClient();

        if (accessToken && refreshToken) {
          const { error } = await auth.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        } else if (token_hash) {
          const first = await supabase.auth.verifyOtp({
            token_hash,
            type: type as any,
          });
          let data = first.data;
          let error = first.error;
          if (error) {
            console.error("Password reset verifyOtp error:", error);
            const retry = await auth.auth.verifyOtp({
              token_hash,
              type: type as any,
            });
            data = retry.data;
            error = retry.error;
          }
          if (error) {
            const code = searchParams.get("code");
            if (code && code !== searchParams.get("token_hash")) {
              const exchanged = await supabase.auth.exchangeCodeForSession(code);
              if (exchanged.error) {
                console.error("Password reset verifyOtp error:", error);
                throw error;
              }
            } else {
              console.error("Password reset verifyOtp error:", error);
              throw error;
            }
          } else if (!data.session) {
            throw new Error("再設定用セッションを確立できませんでした。");
          }
        } else {
          const existing = await auth.auth.getSession();
          const fallback = await supabase.auth.getSession();
          if (!existing.data.session && !fallback.data.session) {
            throw new Error(
              "リンクに token_hash / code が含まれていません。メール内のボタンから開き直してください。",
            );
          }
        }

        if (cancelled) return;
        notifyPasswordRecovery();
        window.history.replaceState({}, "", "/auth/reset-password");
        setStatus("form");
        setMessage("");
        setDetail(null);
      } catch (err) {
        if (cancelled) return;
        console.error("Password reset verifyOtp error:", err);
        setStatus("error");
        setMessage(translateAuthError(err));
        setDetail(`${formatVerifyError(err)}\n\n${REDIRECT_HINT}`);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [nextSearchParams]);

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
      const auth = getImplicitClient();
      let { error } = await auth.auth.updateUser({ password });
      if (error) {
        const retry = await supabase.auth.updateUser({ password });
        error = retry.error;
      }
      if (error) throw error;
      const session =
        (await auth.auth.getSession()).data.session ||
        (await supabase.auth.getSession()).data.session;
      const token = session?.access_token;
      if (token) {
        const completed = await completeAppSession(token, false);
        if (completed.email) applySession(completed);
      }
      setStatus("done");
      setMessage("パスワードを更新しました。トップページでログイン済みです。");
      window.setTimeout(() => {
        window.location.replace("/");
      }, 900);
    } catch (err) {
      console.error("[auth.reset-password] update:", err);
      setMessage(translateAuthError(err));
      setDetail(formatVerifyError(err));
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
          <>
            <p className="mt-4 text-center text-[15px] leading-7 text-muted whitespace-pre-wrap">
              {message}
            </p>
            {detail ? (
              <pre className="mt-4 max-h-48 overflow-auto whitespace-pre-wrap rounded-2xl bg-[#fff8ee] px-4 py-3 text-left text-[12px] leading-6 text-[#9a3412]">
                {detail}
              </pre>
            ) : null}
          </>
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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 items-center justify-center px-5 py-16 text-[15px] font-semibold text-muted">
          再設定リンクを確認しています...
        </main>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
