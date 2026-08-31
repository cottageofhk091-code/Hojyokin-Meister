import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "免責事項",
};

export default function DisclaimerPage() {
  return (
    <LegalPage title="免責事項">
      <section>
        <h2>1. 本サービスの性質</h2>
        <p>
          「{SITE_NAME}」は、AIを活用した文章構成および事業計画のアイデア作成を支援するアシスタントです。地域・業種・事業メモをもとに、補助金・助成金の申請書下書きや制度候補の整理を行います。
        </p>
      </section>
      <section>
        <h2>2. 申請代行ではありません</h2>
        <p>
          本サービスは、官公署等への提出書類の作成代行サービス（行政書士法に定める業務）ではありません。生成された文章は、利用者が内容の正確性を自ら確認・修正したうえで、自己の責任で使用するための下書きです。
        </p>
      </section>
      <section>
        <h2>3. 責任の制限</h2>
        <p>
          生成結果の正確性、完全性、最新性、採択の可否を保証するものではありません。制度改正、公募要領の変更、入力内容の誤り、生成結果の利用により生じた損失・損害について、運営者は一切の責任を負いません。
        </p>
      </section>
      <section>
        <h2>4. 最終判断</h2>
        <p>
          申請の可否、記載内容、添付書類、数値根拠は、最新の公募要領および関係機関の案内に従って、ユーザーご自身でご確認のうえ提出してください。必要に応じて、専門家や公的相談窓口へご自身でご相談ください。
        </p>
      </section>
    </LegalPage>
  );
}
