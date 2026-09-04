import { NextResponse } from "next/server";
import { sanitizeOtpInput } from "@/lib/auth/otp";
import {
  createSession,
  isValidEmail,
  normalizeEmail,
  verifyOtpChallenge,
} from "@/lib/auth/session";
import { ensureAccount } from "@/lib/store/accounts";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が正しくありません。" },
      { status: 400 },
    );
  }

  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const email = normalizeEmail(String(record.email ?? ""));
  const code = sanitizeOtpInput(String(record.code ?? ""));

  if (!isValidEmail(email)) {
    return NextResponse.json(
      { error: "メールアドレスを入力してください。" },
      { status: 400 },
    );
  }
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { error: "6桁の確認コードを入力してください。" },
      { status: 400 },
    );
  }

  try {
    const result = await verifyOtpChallenge(email, code);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    await createSession(email);
    const account = await ensureAccount(email);
    return NextResponse.json({
      ok: true,
      email: account.email,
      is_subscribed: account.is_subscribed,
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim()
        ? error.message
        : "確認コードの検証に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
