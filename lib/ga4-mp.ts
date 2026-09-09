type GA4EventParams = Record<string, string | number | boolean>;

function randomClientId() {
  return crypto.randomUUID();
}

export async function sendGA4Event(
  name: string,
  params: GA4EventParams = {},
) {
  const measurementId = process.env.NEXT_PUBLIC_GA_ID?.trim();
  const apiSecret = process.env.GA4_API_SECRET?.trim();

  if (!measurementId || !apiSecret) {
    console.warn(
      "[GA4] NEXT_PUBLIC_GA_ID または GA4_API_SECRET が未設定のため送信をスキップします。",
    );
    return;
  }

  const url = new URL("https://www.google-analytics.com/mp/collect");
  url.searchParams.set("measurement_id", measurementId);
  url.searchParams.set("api_secret", apiSecret);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: randomClientId(),
      events: [
        {
          name,
          params: {
            engagement_time_msec: 1,
            ...params,
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `GA4 Measurement Protocol failed: ${response.status} ${detail}`.trim(),
    );
  }
}
