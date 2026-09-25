import { NextResponse } from "next/server";
import { getAppBaseUrl } from "@/lib/auth/base-url";
import {
  createRecoveryTicketToken,
  formatRecoveryCookieHeader,
  readRecoveryTicket,
} from "@/lib/auth/recovery-ticket";
import { verifyRecoveryOtp } from "@/lib/auth/verify-email-otp";
import { findAuthUserByEmail } from "@/lib/supabase-admin";
import { logSupabaseNetworkFailure } from "@/lib/supabase-network";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function tokenFromSearch(url: URL) {
  return (
    url.searchParams.get("token_hash") ||
    url.searchParams.get("token") ||
    url.searchParams.get("code") ||
    ""
  ).trim();
}

function errorRedirect(req: Request, message: string) {
  const dest = new URL("/auth/reset-password", `${getAppBaseUrl(req)}/`);
  dest.searchParams.set("error", "1");
  dest.searchParams.set("reason", message.slice(0, 180));
  return NextResponse.redirect(dest);
}

async function completeResetVerify(tokenHash: string, typeRaw: string) {
  const verified = await verifyRecoveryOtp({
    tokenHash,
    typeRaw: typeRaw || "recovery",
  });
  const user = await findAuthUserByEmail(verified.email);
  const ticket = await createRecoveryTicketToken({
    email: verified.email,
    uid: user?.id || "",
  });
  return { email: verified.email, cookie: formatRecoveryCookieHeader(ticket) };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tokenHash = tokenFromSearch(url);
  const typeRaw = url.searchParams.get("type") || "recovery";

  if (!tokenHash) {
    const existing = await readRecoveryTicket();
    if (existing) {
      return NextResponse.json({ ok: true, verified: true, email: existing.email });
    }
    return NextResponse.json(
      { error: "リンクに token_hash / code が含まれていません。メール内のボタンから開き直してください。" },
      { status: 400 },
    );
  }

  try {
    const verified = await completeResetVerify(tokenHash, typeRaw);
    const dest = new URL("/auth/reset-password", `${getAppBaseUrl(req)}/`);
    dest.searchParams.set("reset", "1");
    const res = NextResponse.redirect(dest);
    res.headers.append("Set-Cookie", verified.cookie);
    return res;
  } catch (error) {
    logSupabaseNetworkFailure("auth.verify-reset.GET", error);
    const message = error instanceof Error ? error.message : String(error);
    console.error("[auth.verify-reset] GET failed:", message, error);
    return errorRedirect(req, message || "確認リンクの検証に失敗しました。");
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      token_hash?: unknown;
      token?: unknown;
      code?: unknown;
      type?: unknown;
    };
    const tokenHash = String(
      body.token_hash ?? body.token ?? body.code ?? "",
    ).trim();
    const typeRaw = String(body.type ?? "recovery").trim() || "recovery";

    if (!tokenHash) {
      const existing = await readRecoveryTicket();
      if (existing) {
        return NextResponse.json({ ok: true, verified: true, email: existing.email });
      }
      return NextResponse.json(
        { error: "確認リンクの token_hash がありません。" },
        { status: 400 },
      );
    }

    const verified = await completeResetVerify(tokenHash, typeRaw);
    const res = NextResponse.json({
      ok: true,
      verified: true,
      email: verified.email,
    });
    res.headers.append("Set-Cookie", verified.cookie);
    return res;
  } catch (error) {
    logSupabaseNetworkFailure("auth.verify-reset.POST", error);
    const message = error instanceof Error ? error.message : String(error);
    console.error("[auth.verify-reset] POST failed:", message, error);
    return NextResponse.json(
      { error: message || "確認リンクの検証に失敗しました。" },
      { status: 400 },
    );
  }
}
