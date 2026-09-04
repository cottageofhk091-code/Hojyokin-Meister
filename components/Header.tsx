"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { LogoMark } from "@/components/LogoMark";
import { useAuth } from "@/components/AuthProvider";
import { DevPremiumToggle } from "@/components/DevPremiumToggle";
import {
  SiteInfoModal,
  type InfoModalKey,
} from "@/components/SiteInfoModal";
import { SITE_NAME } from "@/lib/site";

const NAV_ITEMS: Array<{ key: InfoModalKey; label: string }> = [
  { key: "features", label: "4つの支援" },
  { key: "pricing", label: "料金" },
  { key: "faq", label: "よくある質問" },
];

export function Header() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<InfoModalKey | null>(null);

  function openModal(key: InfoModalKey) {
    setModal(key);
    setOpen(false);
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0F172A]/95 text-white backdrop-blur-md">
        <div className="mx-auto flex h-[64px] w-full max-w-[1120px] items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
            <LogoMark size="sm" />
            <span className="text-[15px] font-extrabold tracking-tight sm:text-[16px]">
              {SITE_NAME}
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="メインナビゲーション">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => openModal(item.key)}
                className="rounded-full px-3.5 py-2 text-[13px] font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-[#F59E0B]"
              >
                {item.label}
              </button>
            ))}
            <Link
              href="/mypage"
              className="ml-1 rounded-full px-3.5 py-2 text-[13px] font-medium text-[#FDE68A] hover:bg-white/5 hover:text-[#F59E0B]"
            >
              マイページ
            </Link>
            <DevPremiumToggle />
            {user?.email ? (
              <button
                type="button"
                onClick={() => void signOut()}
                className="rounded-full px-3.5 py-2 text-[13px] font-medium text-white/70 hover:bg-white/5 hover:text-white"
              >
                ログアウト
              </button>
            ) : (
              <Link
                href="/login"
                className="rounded-full px-3.5 py-2 text-[13px] font-medium text-white/80 hover:bg-white/5 hover:text-[#F59E0B]"
              >
                ログイン
              </Link>
            )}
          </nav>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "メニューを閉じる" : "メニューを開く"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {open ? (
          <nav
            id="mobile-nav"
            className="border-t border-white/10 bg-[#0F172A] px-5 py-4 lg:hidden"
            aria-label="モバイルナビゲーション"
          >
            <ul className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <li key={item.key}>
                  <button
                    type="button"
                    className="block w-full rounded-xl px-3 py-2.5 text-left text-[14px] font-medium text-white/90 hover:bg-white/5 hover:text-[#F59E0B]"
                    onClick={() => openModal(item.key)}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
              <li>
                <Link
                  href="/mypage"
                  className="block rounded-xl px-3 py-2.5 text-[14px] font-medium text-[#FDE68A] hover:bg-white/5"
                  onClick={() => setOpen(false)}
                >
                  マイページ
                </Link>
              </li>
              <li>
                <DevPremiumToggle compact />
              </li>
              <li>
                {user?.email ? (
                  <button
                    type="button"
                    className="block w-full rounded-xl px-3 py-2.5 text-left text-[14px] font-medium text-white/90 hover:bg-white/5"
                    onClick={() => {
                      setOpen(false);
                      void signOut();
                    }}
                  >
                    ログアウト
                  </button>
                ) : (
                  <Link
                    href="/login"
                    className="block rounded-xl px-3 py-2.5 text-[14px] font-medium text-white/90 hover:bg-white/5"
                    onClick={() => setOpen(false)}
                  >
                    ログイン
                  </Link>
                )}
              </li>
            </ul>
          </nav>
        ) : null}
      </header>
      <SiteInfoModal openKey={modal} onClose={() => setModal(null)} />
    </>
  );
}
