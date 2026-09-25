import { jwtVerify, SignJWT } from "jose";
import {
  RECOVERY_COOKIE,
  clearCookie,
  readCookie,
  secretKey,
  setCookie,
} from "@/lib/auth/cookies";
import { isValidEmail } from "@/lib/auth/session";

const RECOVERY_MAX_AGE = 60 * 15;

export type RecoveryTicket = {
  email: string;
  uid: string;
};

export async function createRecoveryTicketToken(input: RecoveryTicket) {
  return new SignJWT({
    email: input.email,
    uid: input.uid,
    purpose: "recovery",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${RECOVERY_MAX_AGE}s`)
    .sign(secretKey());
}

export function formatRecoveryCookieHeader(token: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${RECOVERY_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${RECOVERY_MAX_AGE}${secure}`;
}

export function formatClearRecoveryCookieHeader() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${RECOVERY_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export async function setRecoveryTicket(input: RecoveryTicket) {
  const token = await createRecoveryTicketToken(input);
  await setCookie(RECOVERY_COOKIE, token, RECOVERY_MAX_AGE);
  return token;
}

export async function readRecoveryTicket(): Promise<RecoveryTicket | null> {
  const token = await readCookie(RECOVERY_COOKIE);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (payload.purpose !== "recovery") return null;
    const email = String(payload.email ?? "").trim().toLowerCase();
    const uid = String(payload.uid ?? "").trim();
    if (!isValidEmail(email)) return null;
    return { email, uid };
  } catch {
    return null;
  }
}

export async function clearRecoveryTicket() {
  await clearCookie(RECOVERY_COOKIE);
}
