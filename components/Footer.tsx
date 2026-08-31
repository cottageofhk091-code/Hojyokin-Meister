import Link from "next/link";
import { FOOTER_DISCLAIMER, SITE_NAME } from "@/lib/site";

const FOOTER_LINKS = [
  { href: "/disclaimer", label: "免責事項" },
  { href: "/terms", label: "利用規約" },
  { href: "/tokushoho", label: "特定商取引法に基づく表記" },
  { href: "/privacy", label: "プライバシーポリシー" },
  { href: "/contact", label: "お問い合わせ" },
] as const;

export function Footer() {
  return (
    <footer className="mt-auto border-t border-white/10 bg-[#0F172A] text-white">
      <div className="mx-auto w-full max-w-[1120px] px-5 py-10">
        <p className="mx-auto max-w-[720px] text-center text-[12px] leading-7 text-white/70">
          {FOOTER_DISCLAIMER}
        </p>
        <nav aria-label="フッターナビゲーション" className="mt-6">
          <ul className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2 text-[12px] leading-5 text-white/75">
            {FOOTER_LINKS.map((item, index) => (
              <li key={item.href} className="flex items-center gap-2">
                {index > 0 ? (
                  <span aria-hidden className="text-[#F59E0B]/50">
                    |
                  </span>
                ) : null}
                <Link
                  href={item.href}
                  className="underline-offset-4 hover:text-[#F59E0B] hover:underline"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="mt-5 text-center text-[11px] leading-5 text-white/45">
          © {new Date().getFullYear()} {SITE_NAME} / Nomad Flow Lab
        </p>
      </div>
    </footer>
  );
}
