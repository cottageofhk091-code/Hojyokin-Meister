import { NextResponse } from "next/server";
import { verifyRecoveryOtp } from "@/lib/auth/verify-email-otp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      token_hash?: unknown;
      type?: unknown;
    };
    const tokenHash = String(body.token_hash ?? "").trim();
    const typeRaw = String(body.type ?? "recovery").trim() || "recovery";
    if (!tokenHash) {
      return NextResponse.json(
        { error: "確認リンクの token_hash がありません。" },
        { status: 400 },
      );
    }

    const verified = await verifyRecoveryOtp({ tokenHash, typeRaw });
    if (!verified.access_token || !verified.refresh_token) {
      console.error("[auth.verify-recovery] session missing after verifyOtp", {
        type: verified.type,
        email: verified.email,
      });
      return NextResponse.json(
        { error: "再設定用セッションを確立できませんでした。リンクの有効期限をご確認ください。" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      email: verified.email,
      type: verified.type,
      access_token: verified.access_token,
      refresh_token: verified.refresh_token,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[auth.verify-recovery] failed:", message, error);
    return NextResponse.json({ error: message || "確認リンクの検証に失敗しました。" }, { status: 400 });
  }
}
