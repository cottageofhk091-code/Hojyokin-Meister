"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthResetPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(
      `/auth/reset-password${window.location.search}${window.location.hash}`,
    );
  }, [router]);

  return (
    <main className="flex flex-1 items-center justify-center px-5 py-16 text-[15px] font-semibold text-muted">
      パスワード再設定へ移動しています...
    </main>
  );
}
