import { NextResponse } from "next/server";
import { issueSessionForEmail, jsonWithSession } from "@/lib/auth-session";
import {
  formatClearRecoveryCookieHeader,
  readRecoveryTicket,
} from "@/lib/auth/recovery-ticket";
import { findAuthUserByEmail, getSupabaseAdmin } from "@/lib/supabase-admin";
import { logSupabaseNetworkFailure } from "@/lib/supabase-network";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      password?: unknown;
      passwordConfirm?: unknown;
    };
    const password = String(body.password ?? "");
    const passwordConfirm =
      body.passwordConfirm == null ? password : String(body.passwordConfirm ?? "");

    if (password.length < 6) {
      return NextResponse.json(
        { error: "パスワードは6文字以上で入力してください" },
        { status: 400 },
      );
    }
    if (password !== passwordConfirm) {
      return NextResponse.json(
        { error: "パスワード（確認）が一致しません。" },
        { status: 400 },
      );
    }

    const ticket = await readRecoveryTicket();
    if (!ticket) {
      return NextResponse.json(
        { error: "再設定用セッションの有効期限が切れています。メール内のリンクから開き直してください。" },
        { status: 401 },
      );
    }

    const user =
      (ticket.uid ? { id: ticket.uid, email: ticket.email } : null) ||
      (await findAuthUserByEmail(ticket.email));
    if (!user?.id) {
      return NextResponse.json(
        { error: "このメールアドレスのアカウントが見つかりません。" },
        { status: 404 },
      );
    }

    const { error } = await getSupabaseAdmin().auth.admin.updateUserById(user.id, {
      password,
    });
    if (error) {
      logSupabaseNetworkFailure("auth.update-password", error);
      throw error;
    }

    const issued = await issueSessionForEmail(ticket.email);
    const res = jsonWithSession(issued.body, issued.cookie);
    res.headers.append("Set-Cookie", formatClearRecoveryCookieHeader());
    return res;
  } catch (error) {
    logSupabaseNetworkFailure("auth.update-password", error);
    const message = error instanceof Error ? error.message : String(error);
    console.error("[auth.update-password] failed:", message, error);
    return NextResponse.json(
      { error: message || "パスワードの更新に失敗しました。" },
      { status: 400 },
    );
  }
}
