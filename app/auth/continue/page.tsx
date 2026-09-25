"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { translateAuthError } from "@/lib/auth-errors";
import { notifyPasswordRecovery, notifySignupConfirmed } from "@/lib/auth-client";

const OTP_TYPES = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

export default function AuthContinuePage() {
  const router = useRouter();
  const [message, setMessage] = useState("ログインを確認しています...");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const url = new URL(window.location.href);
        const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
        const tokenHash =
          url.searchParams.get("token_hash") || hashParams.get("token_hash");
        const typeRaw = url.searchParams.get("type") || hashParams.get("type");
        const type =
          typeRaw && OTP_TYPES.has(typeRaw as EmailOtpType)
            ? (typeRaw as EmailOtpType)
            : null;
        const code = url.searchParams.get("code");

        if (tokenHash && type) {
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
        const token = data.session?.access_token;
        if (!token) throw new Error("リンクが無効か、有効期限が切れています。");
        if (cancelled) return;

        const recovered =
          type === "recovery" ||
          hashParams.get("type") === "recovery" ||
          url.searchParams.get("type") === "recovery";
        if (recovered) {
          notifyPasswordRecovery();
          router.replace("/auth/password-reset-notice");
          return;
        }

        const grantBonus = type === "signup" || type === "email";
        const res = await fetch("/api/auth/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ access_token: token, grantBonus }),
        });
        const completed = (await res.json()) as {
          error?: string;
          email?: string;
          bonusGranted?: boolean;
        };
        if (!res.ok || !completed.email) {
          throw new Error(completed.error || "認証に失敗しました");
        }
        if (completed.bonusGranted || type === "signup" || type === "email") {
          notifySignupConfirmed({ bonusGranted: Boolean(completed.bonusGranted) });
          router.replace("/auth/confirmed");
          return;
        }
        router.replace("/");
      } catch (err) {
        if (cancelled) return;
        setMessage(translateAuthError(err));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="flex flex-1 items-center justify-center px-5 py-16 text-[15px] font-semibold text-muted">
      {message}
    </main>
  );
}
