import type { Metadata } from "next";
import { ContactForm } from "@/components/ContactForm";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "お問い合わせ",
};

export default function ContactPage() {
  return (
    <LegalPage title="お問い合わせ">
      <p>
        サービスに関するご質問、所在地等の開示請求は、以下のフォームからお送りください。現時点ではデモ受付です。本番公開後に、運営（Nomad Flow Lab）よりご連絡する想定です。
      </p>
      <ContactForm />
    </LegalPage>
  );
}
