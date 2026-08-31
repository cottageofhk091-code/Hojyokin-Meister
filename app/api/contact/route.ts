import { NextResponse } from "next/server";

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

  const payload =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const name = String(payload.name ?? "").trim();
  const email = String(payload.email ?? "").trim();
  const subject = String(payload.subject ?? "").trim();
  const message = String(payload.message ?? "").trim();

  if (!name || !email || !subject || !message) {
    return NextResponse.json(
      { error: "必須項目を入力してください。" },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, demo: true });
}
