import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

type PremiumPurchase = {
  sessionId: string;
  email: string | null;
  clientReferenceId: string | null;
  customerId: string | null;
  paymentIntentId: string | null;
  paymentStatus: string | null;
  amountTotal: number | null;
  currency: string | null;
};

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!secretKey || !webhookSecret) {
    const missing = [
      !secretKey ? "STRIPE_SECRET_KEY" : null,
      !webhookSecret ? "STRIPE_WEBHOOK_SECRET" : null,
    ].filter((name): name is string => Boolean(name));

    return NextResponse.json(
      {
        error: `Webhookの設定が完了していません。環境変数（${missing.join("、")}）を確認してください。`,
      },
      { status: 500 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "stripe-signature ヘッダーがありません。" },
      { status: 400 },
    );
  }

  const payload = await request.text();
  if (!payload) {
    return NextResponse.json(
      { error: "リクエスト本文が空です。" },
      { status: 400 },
    );
  }

  const stripe = new Stripe(secretKey);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim()
        ? error.message
        : "Webhookの署名検証に失敗しました。";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
    }
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim()
        ? error.message
        : "Webhookイベントの処理に失敗しました。";
    console.error("[stripe:webhook]", event.type, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const purchase: PremiumPurchase = {
    sessionId: session.id,
    email: session.customer_details?.email ?? null,
    clientReferenceId: session.client_reference_id ?? null,
    customerId:
      typeof session.customer === "string"
        ? session.customer
        : (session.customer?.id ?? null),
    paymentIntentId:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : (session.payment_intent?.id ?? null),
    paymentStatus: session.payment_status ?? null,
    amountTotal: session.amount_total ?? null,
    currency: session.currency ?? null,
  };

  console.info("[stripe:checkout.session.completed]", purchase);

  await fulfillPremiumPurchase(purchase);
}

async function fulfillPremiumPurchase(_purchase: PremiumPurchase) {
  // 将来: email / clientReferenceId をキーに、ユーザーの購入フラグをDBへ保存する。
}
