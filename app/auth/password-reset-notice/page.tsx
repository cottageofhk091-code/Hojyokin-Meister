"use client";

import { useEffect, useState } from "react";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { notifyPasswordRecovery } from "@/lib/auth-client";
import { translateAuthError } from "@/lib/auth-errors";
import { SITE_NAME } from "@/lib/site";

const SUCCESS_TITLE = "認証が完了しました。元の画面（タブ）に戻ってお続けください";
const SUCCESS_BODY =
  "元々開いていた画面に戻り、新しいパスワードを入力してください。この画面は閉じて構いません。";

export default function PasswordResetNoticePage() {
  const [status, setStatus] = useState<"working" | "ok" | "error">("working");
  const [message, setMessage] = useState("再設定リンクを確認しています...");

  useEffect(() => {
    let cancelled = false;

    const finishOk = () => {
      if (cancelled) return;
      notifyPasswordRecovery();
      setStatus("ok");
      setMessage(SUCCESS_BODY);
    };

    void (async () => {
      try {
        const url = new URL(window.location.href);
        const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
        const tokenHash =
          url.searchParams.get("token_hash") || hashParams.get("token_hash");
        const typeRaw =
          url.searchParams.get("type") || hashParams.get("type") || "recovery";
        const type = (typeRaw as EmailOtpType) || "recovery";
        const code = url.searchParams.get("code");

        if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type,
          });
          if (error) throw error;
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        const { data } = await supabase.auth.getSession();
        if (data.session) {
          window.history.replaceState({}, "", "/auth/password-reset-notice");
        }
        finishOk();
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setMessage(translateAuthError(err));
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
      </section>
    </main>
  );
}
