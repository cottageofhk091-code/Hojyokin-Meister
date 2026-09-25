"use client";

import { useEffect, useState } from "react";
import { completeAppSession, notifySignupConfirmed } from "@/lib/auth-client";
import { translateAuthError } from "@/lib/auth-errors";
import { SITE_NAME } from "@/lib/site";
import { supabase } from "@/lib/supabaseClient";

const SUCCESS_TITLE = "認証が完了しました。元の画面（タブ）に戻ってお続けください";
const SUCCESS_BODY =
  "このウィンドウは閉じて構いません。元々開いていた画面でご利用を続けてください。";
const REDIRECT_HINT =
  "Supabase の Authentication → URL Configuration で Site URL と Redirect URLs に https://hojyokin-meister-1.vercel.app/** が含まれているか確認してください。";

export default function AuthConfirmedPage() {
  const [status, setStatus] = useState<"working" | "ok" | "error">("working");
  const [message, setMessage] = useState("メールアドレスを確認しています...");

  useEffect(() => {
    let cancelled = false;

    const finishOk = (bonusGranted?: boolean) => {
      if (cancelled) return;
      notifySignupConfirmed({ bonusGranted: Boolean(bonusGranted) });
      window.location.replace("/?registered=true");
    };

    void (async () => {
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.get("error") === "1") {
          const reason = url.searchParams.get("reason") || "確認リンクの検証に失敗しました。";
          console.error("[auth.confirmed] callback error:", reason);
          throw new Error(reason);
        }

        const tokenHash = url.searchParams.get("token_hash");
        const code = url.searchParams.get("code");
        if (tokenHash || code) {
          const dest = new URL("/auth/callback", window.location.origin);
          dest.search = url.search;
          dest.hash = url.hash;
          window.location.replace(`${dest.pathname}${dest.search}${dest.hash}`);
          return;
        }

        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (token) {
          const completed = await completeAppSession(token, true);
          if (cancelled) return;
          finishOk(completed.bonusGranted);
          return;
        }

        const sessionRes = await fetch("/api/auth/me", { cache: "no-store" });
        const sessionData = (await sessionRes.json()) as { user?: { email?: string } | null };
        if (sessionData.user?.email) {
          finishOk(true);
          return;
        }

        throw new Error(
          "リンクが無効か、有効期限が切れています。元の画面から登録をやり直してください。",
        );
      } catch (err) {
        if (cancelled) return;
        const raw = err instanceof Error ? err.message : String(err);
        console.error("[auth.confirmed] failed:", raw, err);
        setStatus("error");
        setMessage(`${translateAuthError(err)}\n\n${REDIRECT_HINT}`);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="flex flex-1 items-center justify-center px-5 py-16">
      <section className="card-luxury w-full max-w-[480px] rounded-[24px] border border-line bg-white p-8 text-center">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-accent">
          {SITE_NAME}
        </p>
        <h1 className="mt-2 text-[22px] font-extrabold leading-8 tracking-tight text-brand">
          {status === "working"
            ? "確認中"
            : status === "ok"
              ? SUCCESS_TITLE
              : "確認できませんでした"}
        </h1>
        <p className="mt-4 text-[15px] leading-7 text-muted whitespace-pre-wrap">{message}</p>
        {status === "ok" ? (
          <button
            type="button"
            onClick={() => window.close()}
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-r from-[#D97706] to-[#F59E0B] px-5 text-[14px] font-bold text-[#0F172A]"
          >
            このウィンドウを閉じる
          </button>
        ) : null}
        {status === "error" ? (
          <a
            href="/"
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full border border-line px-5 text-[14px] font-bold"
          >
            トップへ戻る
          </a>
        ) : null}
      </section>
    </main>
  );
}
