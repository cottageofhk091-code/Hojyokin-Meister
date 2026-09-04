import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { AuthProvider } from "@/components/AuthProvider";
import { PremiumProvider } from "@/components/PremiumProvider";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-noto-sans-jp",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME}｜補助金・助成金の申請書作成`,
    template: `%s｜${SITE_NAME}`,
  },
  description: SITE_TAGLINE,
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className={`${notoSansJP.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <AuthProvider>
          <PremiumProvider>
            <Header />
            <div className="flex flex-1 flex-col">{children}</div>
            <Footer />
          </PremiumProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
