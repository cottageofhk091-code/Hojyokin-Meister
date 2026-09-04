import type { Metadata } from "next";
import { ProposalDetail } from "@/components/ProposalDetail";

export const metadata: Metadata = {
  title: "申請書の骨子",
};

export default function ProposalDetailPage() {
  return <ProposalDetail />;
}
