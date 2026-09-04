import type { Metadata } from "next";
import { MyPageDashboard } from "@/components/MyPageDashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "マイページ（申請履歴）",
};

export default function MyPage() {
  return <MyPageDashboard />;
}
