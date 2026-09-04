import { Resend } from "resend";
import { SITE_NAME } from "@/lib/site";

export async function sendOtpEmail(to: string, code: string) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.EMAIL_FROM?.trim() || "AI補助金マイスター <onboarding@resend.dev>";

  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY が設定されていません。");
    }
    console.info(`[auth] ${to} の確認コード: ${code}`);
    return;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `【${SITE_NAME}】確認コード ${code}`,
    text: `${SITE_NAME} のログイン確認コードは ${code} です。有効期限は10分です。`,
    html: `
      <div style="font-family:sans-serif;line-height:1.7;color:#0F172A;padding:16px">
        <p style="font-size:14px;margin:0 0 12px">${SITE_NAME} のログイン確認コードです。</p>
        <p style="font-size:32px;letter-spacing:0.24em;font-weight:800;margin:12px 0;color:#D97706">${code}</p>
        <p style="font-size:13px;color:#64748B;margin:0">有効期限は10分です。このメールに心当たりがない場合は破棄してください。</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(error.message || "確認コードのメール送信に失敗しました。");
  }
}
