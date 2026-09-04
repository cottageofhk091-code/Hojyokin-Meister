import { cookies } from "next/headers";

export const SESSION_COOKIE = "aim_session";
export const OTP_COOKIE = "aim_otp";

export function getAuthSecret() {
  const secret =
    process.env.AUTH_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    "";
  if (secret.length >= 16) return secret;
  if (process.env.NODE_ENV !== "production") {
    return "dev-auth-secret-ai-hojokin-meister";
  }
  throw new Error("AUTH_SECRET が設定されていません。");
}

export function secretKey() {
  return new TextEncoder().encode(getAuthSecret());
}

export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export async function setCookie(name: string, value: string, maxAge: number) {
  const jar = await cookies();
  jar.set(name, value, cookieOptions(maxAge));
}

export async function clearCookie(name: string) {
  const jar = await cookies();
  jar.set(name, "", { ...cookieOptions(0), maxAge: 0 });
}

export async function readCookie(name: string) {
  const jar = await cookies();
  return jar.get(name)?.value ?? null;
}
