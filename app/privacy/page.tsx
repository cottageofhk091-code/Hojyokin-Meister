import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="プライバシーポリシー">
      <p>
        {SITE_NAME} 運営事務局（Nomad Flow Lab、以下「当方」）は、本サービスの提供にあたり取得する情報の取扱いを、以下のとおり定めます。
      </p>
      <section>
        <h2>1. 取得する情報</h2>
        <ul>
          <li>利用者が入力する地域、業種、事業メモその他の入力データ</li>
          <li>お問い合わせ時の氏名、メールアドレス、件名、本文</li>
          <li>アクセスログ、端末情報、ブラウザ情報、Cookie等の識別子</li>
          <li>有料決済を導入した場合の決済に必要な情報（決済事業者を通じて取得）</li>
        </ul>
      </section>
      <section>
        <h2>2. 利用目的</h2>
        <ul>
          <li>下書き生成その他、本サービスの提供・改善</li>
          <li>お問い合わせへの対応</li>
          <li>不正利用の防止、セキュリティの確保</li>
          <li>利用状況の把握およびサービス品質の向上（アクセス解析を含む）</li>
        </ul>
      </section>
      <section>
        <h2>3. 第三者提供</h2>
        <p>
          当方は、法令に基づく場合を除き、本人の同意なく個人情報を第三者に提供しません。サーバー、生成AI、決済、アクセス解析など、サービス提供に必要な業務委託先に対しては、必要な範囲でのみ情報を取り扱わせます。
        </p>
      </section>
      <section>
        <h2>4. アクセス解析ツール</h2>
        <p>
          当方は、利用状況の把握のため、Google Analytics 等のアクセス解析ツールを使用する場合があります。これらのツールは Cookie を使用して利用者のサイト利用情報を収集することがあります。収集される情報は、各事業者のプライバシーポリシーに基づいて管理されます。ブラウザの設定により Cookie を無効にできます。
        </p>
      </section>
      <section>
        <h2>5. Cookie</h2>
        <p>
          本サービスは、利便性向上、セッション維持、アクセス解析のために Cookie を使用することがあります。ブラウザ設定で拒否できますが、一部機能が利用できなくなる場合があります。
        </p>
      </section>
      <section>
        <h2>6. 入力データの取扱い</h2>
        <p>
          事業メモなどの入力内容は、下書き生成のために生成AIへ送信される場合があります。個人を特定できる情報、機密情報は、可能な範囲で入力しないでください。
        </p>
      </section>
      <section>
        <h2>7. 開示等の請求</h2>
        <p>
          個人情報の開示、訂正、削除等のご請求は、お問い合わせフォームよりご連絡ください。
        </p>
      </section>
      <p className="text-muted">制定日: 2026年8月29日</p>
    </LegalPage>
  );
}
