import { NextResponse } from "next/server";
import { sendOtpEmail } from "@/lib/auth/mail";
import { RateLimitError, assertCanSendOtp, recordOtpSend } from "@/lib/auth/rate-limit";
import {
  createOtpChallenge,
  generateOtpCode,
  isValidEmail,
  normalizeEmail,
} from "@/lib/auth/session";

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

  const email = normalizeEmail(String((body as { email?: unknown })?.email ?? ""));
  if (!isValidEmail(email)) {
    return NextResponse.json(
      { error: "メールアドレスを入力してください。" },
      { status: 400 },
    );
  }

  try {
    assertCanSendOtp(email);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "しばらくしてから再試行してください。";
    return NextResponse.json(
      { error: message },
      { status: error instanceof RateLimitError ? 429 : 500 },
    );
  }

  const code = generateOtpCode();

  try {
    await sendOtpEmail(email, code);
    await createOtpChallenge(email, code);
    recordOtpSend(email);
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim()
        ? error.message
        : "確認コードを送信できませんでした。";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
