import { supabase } from "@/lib/supabaseClient";

export async function trackVisit() {
  if (typeof window === "undefined") return;

  const tracked = sessionStorage.getItem("has_tracked_visit");
  if (tracked) return;

  const urlParams = new URLSearchParams(window.location.search);
  const utmSource = urlParams.get("utm_source");
  const referrer = document.referrer;

  let sourceCategory = "Direct";

  if (utmSource) {
    const src = utmSource.toLowerCase();
    if (src.includes("x") || src.includes("twitter")) sourceCategory = "X";
    else if (src.includes("note")) sourceCategory = "note";
    else if (src.includes("google")) sourceCategory = "Google";
    else if (src.includes("yahoo")) sourceCategory = "Yahoo";
    else sourceCategory = utmSource;
  } else if (referrer) {
    const ref = referrer.toLowerCase();
    if (ref.includes("t.co") || ref.includes("x.com") || ref.includes("twitter.com"))
      sourceCategory = "X";
    else if (ref.includes("note.com")) sourceCategory = "note";
    else if (ref.includes("google.")) sourceCategory = "Google";
    else if (ref.includes("yahoo.")) sourceCategory = "Yahoo";
    else if (ref.includes("instagram.com")) sourceCategory = "Instagram";
    else sourceCategory = "Other Referral";
  }

  try {
    const { error } = await supabase.from("analytics_visits").insert({
      app_id: "hojyokin-meister-1",
      source_category: sourceCategory,
      utm_source: utmSource || null,
      referrer: referrer || null,
    });
    if (error) throw error;
    sessionStorage.setItem("has_tracked_visit", "true");
  } catch (err) {
    console.error("Visit tracking failed:", err);
  }
}
