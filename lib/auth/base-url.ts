function cleanUrl(value: string): string {
  return value
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\/$/, "");
}

function isLocalhost(url: string): boolean {
  return /localhost|127\.0\.0\.1/i.test(url);
}

export function getRequestOrigin(req: Request): string {
  const host =
    req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    req.headers.get("host")?.trim() ||
    "";
  if (!host) return "";
  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto =
    forwardedProto ||
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`.replace(/\/$/, "");
}

export function getPublicAppUrl(req?: Request): string {
  const env = cleanUrl(
    process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "",
  );
  const vercelHost = cleanUrl(
    process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || "",
  );
  const vercelUrl = vercelHost
    ? vercelHost.startsWith("http")
      ? vercelHost
      : `https://${vercelHost}`
    : "";

  if (env && !isLocalhost(env)) return env;
  if (vercelUrl && !isLocalhost(vercelUrl)) return vercelUrl.replace(/\/$/, "");
  if (req) {
    const origin = getRequestOrigin(req);
    if (origin) return origin;
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "");
  }
  if (env) return env;
  return "http://localhost:3000";
}

export function getAppBaseUrl(req: Request): string {
  return getRequestOrigin(req) || getPublicAppUrl(req);
}
