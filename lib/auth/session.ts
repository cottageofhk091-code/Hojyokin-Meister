import { createHash, randomInt, timingSafeEqual } from "crypto";
import { jwtVerify, SignJWT } from "jose";
import {
  clearCookie,
  OTP_COOKIE,
  readCookie,
  secretKey,
  SESSION_COOKIE,
  setCookie,
} from "@/lib/auth/cookies";

const OTP_MAX_AGE = 60 * 10;
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
const MAX_ATTEMPTS = 5;

export type SessionUser = { email: string };

type OtpPayload = {
  email: string;
  hash: string;
  attempts: number;
};

function hashCode(email: string, code: string) {
  return createHash("sha256").update(`${email}:${code}`).digest("hex");
}

function hashesMatch(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function generateOtpCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function createOtpChallenge(email: string, code: string) {
  const token = await new SignJWT({
    email,
    hash: hashCode(email, code),
    attempts: 0,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${OTP_MAX_AGE}s`)
    .sign(secretKey());
  await setCookie(OTP_COOKIE, token, OTP_MAX_AGE);
}

async function readOtpChallenge(): Promise<OtpPayload | null> {
  const token = await readCookie(OTP_COOKIE);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const email = String(payload.email ?? "");
    const hash = String(payload.hash ?? "");
    const attempts = Number(payload.attempts ?? 0);
    if (!email || !hash) return null;
    return { email, hash, attempts };
  } catch {
    return null;
  }
}

export async function verifyOtpChallenge(email: string, code: string) {
  const challenge = await readOtpChallenge();
  if (!challenge || challenge.email !== email) {
    return { ok: false as const, error: "確認コードの有効期限が切れているか、再送信が必要です。" };
  }
  if (challenge.attempts >= MAX_ATTEMPTS) {
    await clearCookie(OTP_COOKIE);
    return { ok: false as const, error: "試行回数の上限です。確認コードを再送信してください。" };
  }
  if (!/^\d{6}$/.test(code) || !hashesMatch(challenge.hash, hashCode(email, code))) {
    const token = await new SignJWT({
      email: challenge.email,
      hash: challenge.hash,
      attempts: challenge.attempts + 1,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(`${OTP_MAX_AGE}s`)
      .sign(secretKey());
    await setCookie(OTP_COOKIE, token, OTP_MAX_AGE);
    return { ok: false as const, error: "確認コードが正しくありません。" };
  }
  return { ok: true as const };
}

export async function createSession(email: string) {
  const token = await new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(email)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
  await setCookie(SESSION_COOKIE, token, SESSION_MAX_AGE);
  await clearCookie(OTP_COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = await readCookie(SESSION_COOKIE);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const email = String(payload.email ?? payload.sub ?? "");
    if (!isValidEmail(email)) return null;
    return { email };
  } catch {
    return null;
  }
}

export async function clearSession() {
  await clearCookie(SESSION_COOKIE);
  await clearCookie(OTP_COOKIE);
}
