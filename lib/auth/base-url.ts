export function getAppBaseUrl(req: Request): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (env) return env;
  const proto =
    req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "http";
  const host =
    req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    req.headers.get("host") ||
    "localhost:3000";
  return `${proto}://${host}`;
}
