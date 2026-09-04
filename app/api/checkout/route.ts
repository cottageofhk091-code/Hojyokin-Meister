import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getSessionUser } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  const priceId = process.env.STRIPE_PRICE_ID_PREMIUM?.trim();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");

  if (!secretKey || !priceId || !appUrl) {
    const missing = [
      !secretKey ? "STRIPE_SECRET_KEY" : null,
      !priceId ? "STRIPE_PRICE_ID_PREMIUM" : null,
      !appUrl ? "NEXT_PUBLIC_APP_URL" : null,
    ].filter((name): name is string => Boolean(name));

    return NextResponse.json(
      {
        error: `決済の設定が完了していません。環境変数（${missing.join("、")}）を確認してください。`,
      },
      { status: 500 },
    );
  }

  if (!priceId.startsWith("price_")) {
    return NextResponse.json(
      {
        error:
          "STRIPE_PRICE_ID_PREMIUM が Price ID（price_...）ではありません。Stripe ダッシュボードのプレミアム価格を確認してください。",
      },
      { status: 500 },
    );
  }

  try {
    const stripe = new Stripe(secretKey);
    const user = await getSessionUser();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/?success=true`,
      cancel_url: `${appUrl}/?canceled=true`,
      ...(user
        ? {
            client_reference_id: user.email,
            customer_email: user.email,
            metadata: { email: user.email },
          }
        : {
            metadata: { source: "guest" },
          }),
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "決済ページのURLを発行できませんでした。" },
        { status: 502 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const stripeMessage =
      error instanceof Error && error.message.trim()
        ? error.message
        : "決済の開始に失敗しました。時間をおいて再試行してください。";
    const status =
      error instanceof Error &&
      "statusCode" in error &&
      typeof error.statusCode === "number"
        ? error.statusCode
        : 502;

    return NextResponse.json({ error: stripeMessage }, { status });
  }
}
