const WINDOW_MS = 60 * 60 * 1000;
const MIN_INTERVAL_MS = 45_000;
const MAX_PER_HOUR = 8;

const sentAt = new Map<string, number[]>();

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

function recentSends(email: string, now: number) {
  return (sentAt.get(email) ?? []).filter((time) => now - time < WINDOW_MS);
}

export function assertCanSendOtp(email: string) {
  const now = Date.now();
  const recent = recentSends(email, now);
  const last = recent[recent.length - 1];

  if (last && now - last < MIN_INTERVAL_MS) {
    const waitSec = Math.ceil((MIN_INTERVAL_MS - (now - last)) / 1000);
    throw new RateLimitError(
      `確認コードの再送信は ${waitSec} 秒待ってからお願いします。`,
    );
  }

  if (recent.length >= MAX_PER_HOUR) {
    throw new RateLimitError(
      "送信回数の上限です。しばらくしてから再試行してください。",
    );
  }
}

export function recordOtpSend(email: string) {
  const now = Date.now();
  const recent = recentSends(email, now);
  recent.push(now);
  sentAt.set(email, recent);
}
