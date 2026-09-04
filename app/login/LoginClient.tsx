"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { useAuth } from "@/components/AuthProvider";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const next = searchParams.get("next") || "/mypage";
  const safeNext = next.startsWith("/") ? next : "/mypage";

  useEffect(() => {
    if (!loading && user?.email) router.replace(safeNext);
  }, [loading, router, safeNext, user]);

  const isLoggedIn = Boolean(user?.email);

  return (
    <main className="mx-auto w-full max-w-[28rem] flex-1 px-5 pb-16 pt-10">
      <p className="text-[11px] font-semibold tracking-[0.2em] text-accent">LOGIN</p>
      <h1 className="mt-1 text-[26px] font-extrabold tracking-tight text-brand">
        メールアドレスでログイン
      </h1>
      <p className="mt-2 text-[14px] leading-7 text-muted">
        メールアドレスに届く6桁の確認コードでログインします。メールアドレスがユーザーIDになります。
      </p>
      <div className="card-luxury mt-8 rounded-[24px] border border-line bg-white p-5 sm:p-7">
        {isLoggedIn ? (
          <p className="text-[14px] text-muted">マイページへ移動しています...</p>
        ) : (
          <>
            {loading ? (
              <p className="mb-4 text-[13px] text-muted">セッションを確認しています...</p>
            ) : null}
            <AuthForm
              onSuccess={() => {
                router.replace(safeNext);
                router.refresh();
              }}
            />
          </>
        )}
      </div>
    </main>
  );
}

export function LoginClient() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-[28rem] flex-1 px-5 pb-16 pt-10">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-accent">LOGIN</p>
          <h1 className="mt-1 text-[26px] font-extrabold tracking-tight text-brand">
            メールアドレスでログイン
          </h1>
          <div className="card-luxury mt-8 rounded-[24px] border border-line bg-white p-5 sm:p-7">
            <AuthForm />
          </div>
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
