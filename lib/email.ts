import { Resend } from "resend";
import { SITE_NAME } from "@/lib/site";

export const AUTH_APP_NAME = SITE_NAME;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function getAuthMailerConfigError(): string | null {
  if (!process.env.RESEND_API_KEY?.trim()) {
    return "RESEND_API_KEY が設定されていません。";
  }
  if (!process.env.AUTH_EMAIL_FROM?.trim() && !process.env.EMAIL_FROM?.trim()) {
    return "AUTH_EMAIL_FROM が設定されていません。";
  }
  return null;
}

function fromAddress(): string {
  const raw = (process.env.AUTH_EMAIL_FROM || process.env.EMAIL_FROM || "").trim();
  if (raw.includes("<")) return raw;
  return `${AUTH_APP_NAME} <${raw}>`;
}

function buttonEmailHtml(input: {
  heading: string;
  body: string;
  buttonLabel: string;
  actionUrl: string;
  footer?: string;
}): string {
  const url = escapeHtml(input.actionUrl);
  return `
  <div style="margin:0;padding:24px;background:#f8fafc;font-family:'Hiragino Sans','Hiragino Kaku Gothic ProN',Meiryo,sans-serif;color:#1e293b;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:28px 24px;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.08em;color:#D97706;">${escapeHtml(AUTH_APP_NAME)}</p>
      <h1 style="margin:0 0 16px;font-size:20px;line-height:1.5;">${escapeHtml(input.heading)}</h1>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.8;white-space:pre-wrap;">${escapeHtml(input.body)}</p>
      <p style="margin:0 0 20px;">
        <a href="${url}" style="display:inline-block;padding:12px 20px;background:#D97706;color:#0F172A;text-decoration:none;border-radius:999px;font-weight:700;">${escapeHtml(input.buttonLabel)}</a>
      </p>
      <p style="margin:0 0 8px;font-size:12px;line-height:1.7;color:#64748b;">ボタンが開かない場合は、次のURLをブラウザに貼り付けてください。<br>${url}</p>
      <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;">${escapeHtml(input.footer || "このメールに心当たりがない場合は、破棄してください。")}</p>
    </div>
  </div>
  `;
}

export async function sendAppEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ sent: boolean; error?: string }> {
  const configError = getAuthMailerConfigError();
  if (configError) {
    console.error("[resend.emails.send] skipped: env missing", {
      RESEND_API_KEY: Boolean(process.env.RESEND_API_KEY?.trim()),
      AUTH_EMAIL_FROM: Boolean(process.env.AUTH_EMAIL_FROM?.trim() || process.env.EMAIL_FROM?.trim()),
      detail: configError,
    });
    return { sent: false, error: configError };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY!.trim());
    const { data, error } = await resend.emails.send({
      from: fromAddress(),
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    if (error) {
      const detail = error.message || JSON.stringify(error);
      console.error("[resend.emails.send] failed", error);
      return { sent: false, error: `[resend.emails.send] ${detail}` };
    }
    console.info("[resend.emails.send] ok", { id: data?.id ?? null });
    return { sent: true };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[resend.emails.send] threw", err);
    return { sent: false, error: `[resend.emails.send] ${detail}` };
  }
}

export async function sendSignupConfirmationEmail(
  to: string,
  actionUrl: string,
): Promise<{ sent: boolean; error?: string }> {
  const subject = `【${AUTH_APP_NAME}】会員登録のご確認`;
  const heading = "メールアドレスの確認";
  const body = `${AUTH_APP_NAME} への会員登録ありがとうございます。\n下のボタンを押してメールアドレスを確認すると、登録が完了します。`;
  return sendAppEmail({
    to,
    subject,
    text: `${body}\n\n${actionUrl}\n\nこのメールに心当たりがない場合は、破棄してください。`,
    html: buttonEmailHtml({
      heading,
      body,
      buttonLabel: "メールアドレスを確認する",
      actionUrl,
    }),
  });
}

export async function sendPasswordResetEmail(
  to: string,
  actionUrl: string,
): Promise<{ sent: boolean; error?: string }> {
  const subject = `【${AUTH_APP_NAME}】パスワード再設定のご案内`;
  const heading = "パスワードの再設定";
  const body = `${AUTH_APP_NAME} のパスワード再設定リクエストを受け付けました。\n下のボタンを押して、新しいパスワードを設定してください。`;
  return sendAppEmail({
    to,
    subject,
    text: `${body}\n\n${actionUrl}\n\nこのメールに心当たりがない場合は、破棄してください。`,
    html: buttonEmailHtml({
      heading,
      body,
      buttonLabel: "新しいパスワードを設定する",
      actionUrl,
    }),
  });
}
