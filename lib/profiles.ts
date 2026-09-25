import { findAuthUserByEmail } from "@/lib/supabase-admin";
import {
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from "@/lib/supabase-env";
import {
  ensureAccount,
  getAccount,
  saveCreditState,
  type AccountRecord,
} from "@/lib/store/accounts";

export const USER_PROFILE_APP_NAME = "hojyokin-meister-1";

export const FREE_TRIAL_EXHAUSTED_MESSAGE =
  "無料試用枠を使い切りました。有料プランにご登録ください。";

type CloudProfileRow = {
  id?: string;
  user_id?: string;
  app_name?: string;
  membership_status?: string | null;
  free_credits?: number | null;
  free_pro_credits?: number | null;
  has_used_pro_trial?: boolean | null;
  email?: string | null;
};

function parseCredits(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

async function supabaseHeaders(): Promise<{
  url: string;
  headers: Record<string, string>;
} | null> {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();
  if (!url || !key) return null;
  return {
    url,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
  };
}

async function resolveUserId(email: string): Promise<string> {
  try {
    const user = await findAuthUserByEmail(email);
    if (user?.id) return user.id;
  } catch (err) {
    console.error("[profiles] resolveUserId", err);
  }
  return email;
}

async function fetchUsersProfilesRow(
  cfg: { url: string; headers: Record<string, string> },
  userKey: string,
): Promise<CloudProfileRow | null> {
  const res = await fetch(
    `${cfg.url}/rest/v1/users_profiles?user_id=eq.${encodeURIComponent(userKey)}&app_name=eq.${encodeURIComponent(USER_PROFILE_APP_NAME)}&select=id,user_id,app_name,membership_status,free_pro_credits,created_at&limit=1`,
    { headers: cfg.headers, cache: "no-store" },
  );
  if (res.status === 404 || res.status === 406) return null;
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    if (/could not find|does not exist|schema cache/i.test(detail)) return null;
    console.error("[profiles] users_profiles read failed", res.status, detail);
    return null;
  }
  const rows = (await res.json()) as CloudProfileRow[];
  return rows[0] || null;
}

async function fetchProfilesRow(
  cfg: { url: string; headers: Record<string, string> },
  userKey: string,
): Promise<CloudProfileRow | null> {
  const byId = await fetch(
    `${cfg.url}/rest/v1/profiles?id=eq.${encodeURIComponent(userKey)}&select=id,email,free_credits,has_used_pro_trial&limit=1`,
    { headers: cfg.headers, cache: "no-store" },
  );
  if (byId.ok) {
    const rows = (await byId.json()) as CloudProfileRow[];
    if (rows[0]) return rows[0];
  } else if (byId.status !== 404 && byId.status !== 406) {
    const detail = await byId.text().catch(() => "");
    if (!/could not find|does not exist|schema cache/i.test(detail)) {
      console.error("[profiles] profiles read failed", byId.status, detail);
    }
  }
  return null;
}

async function readCloudCredits(
  email: string,
): Promise<{ credits: number; source: "profiles" | "users_profiles" } | null> {
  const cfg = await supabaseHeaders();
  if (!cfg) return null;
  const uid = await resolveUserId(email);
  const profile = (await fetchProfilesRow(cfg, uid)) || (uid !== email ? await fetchProfilesRow(cfg, email) : null);
  if (profile && profile.free_credits != null) {
    return { credits: parseCredits(profile.free_credits), source: "profiles" };
  }
  const shared =
    (await fetchUsersProfilesRow(cfg, uid)) ||
    (uid !== email ? await fetchUsersProfilesRow(cfg, email) : null);
  if (shared && shared.free_pro_credits != null) {
    return { credits: parseCredits(shared.free_pro_credits), source: "users_profiles" };
  }
  return null;
}

async function writeCloudCredits(
  email: string,
  credits: number,
  isPaid: boolean,
): Promise<boolean> {
  const cfg = await supabaseHeaders();
  if (!cfg) return false;
  const uid = await resolveUserId(email);
  const payloadCredits = Math.max(0, credits);
  let wrote = false;

  const existingProfile =
    (await fetchProfilesRow(cfg, uid)) ||
    (uid !== email ? await fetchProfilesRow(cfg, email) : null);
  const profileBody = {
    id: existingProfile?.id || uid,
    email,
    free_credits: payloadCredits,
    has_used_pro_trial: payloadCredits <= 0,
  };
  const profileMethod = existingProfile?.id ? "PATCH" : "POST";
  const profileUrl = existingProfile?.id
    ? `${cfg.url}/rest/v1/profiles?id=eq.${encodeURIComponent(existingProfile.id)}`
    : `${cfg.url}/rest/v1/profiles`;
  const profileRes = await fetch(profileUrl, {
    method: profileMethod,
    headers: cfg.headers,
    body: JSON.stringify(
      existingProfile?.id
        ? {
            free_credits: payloadCredits,
            has_used_pro_trial: payloadCredits <= 0,
            email,
          }
        : profileBody,
    ),
  });
  if (profileRes.ok) {
    wrote = true;
  } else {
    const detail = await profileRes.text().catch(() => "");
    if (!/could not find|does not exist|schema cache/i.test(detail)) {
      console.error("[profiles] profiles write failed", profileRes.status, detail);
    }
  }

  const existingShared =
    (await fetchUsersProfilesRow(cfg, uid)) ||
    (uid !== email ? await fetchUsersProfilesRow(cfg, email) : null);
  if (existingShared?.id) {
    const patchRes = await fetch(
      `${cfg.url}/rest/v1/users_profiles?id=eq.${encodeURIComponent(existingShared.id)}`,
      {
        method: "PATCH",
        headers: cfg.headers,
        body: JSON.stringify({
          membership_status: isPaid ? "paid" : "free",
          free_pro_credits: payloadCredits,
        }),
      },
    );
    if (patchRes.ok) wrote = true;
    else {
      console.error(
        "[profiles] users_profiles PATCH failed",
        patchRes.status,
        await patchRes.text().catch(() => ""),
      );
    }
  } else {
    const insertRes = await fetch(`${cfg.url}/rest/v1/users_profiles`, {
      method: "POST",
      headers: cfg.headers,
      body: JSON.stringify({
        user_id: uid,
        app_name: USER_PROFILE_APP_NAME,
        membership_status: isPaid ? "paid" : "free",
        free_pro_credits: payloadCredits,
      }),
    });
    if (insertRes.ok) wrote = true;
    else {
      const detail = await insertRes.text().catch(() => "");
      if (!/could not find|does not exist|schema cache|duplicate/i.test(detail)) {
        console.error("[profiles] users_profiles INSERT failed", insertRes.status, detail);
      }
    }
  }

  return wrote;
}

export async function getCreditSnapshot(email: string): Promise<{
  freeCredits: number;
  is_subscribed: boolean;
  signupBonusGranted: boolean;
  account: AccountRecord;
}> {
  const account = await ensureAccount(email);
  const cloud = await readCloudCredits(email);
  const freeCredits = cloud ? cloud.credits : parseCredits(account.free_credits);
  return {
    freeCredits,
    is_subscribed: account.is_subscribed,
    signupBonusGranted: Boolean(account.signup_bonus_granted),
    account,
  };
}

export async function grantSignupBonus(email: string): Promise<{
  freeCredits: number;
  is_subscribed: boolean;
  signupBonusGranted: boolean;
}> {
  const current = await getCreditSnapshot(email);
  if (current.signupBonusGranted) {
    return {
      freeCredits: current.freeCredits,
      is_subscribed: current.is_subscribed,
      signupBonusGranted: true,
    };
  }
  const nextCredits = current.freeCredits > 0 ? current.freeCredits : 1;
  const account = await saveCreditState(email, {
    free_credits: nextCredits,
    signup_bonus_granted: true,
  });
  const wrote = await writeCloudCredits(email, nextCredits, account.is_subscribed);
  if (!wrote && (await supabaseHeaders())) {
    throw new Error("無料枠の付与がデータベースに反映されませんでした。");
  }
  const verified = await getCreditSnapshot(email);
  return {
    freeCredits: verified.freeCredits,
    is_subscribed: verified.is_subscribed,
    signupBonusGranted: true,
  };
}

export async function consumeFreeCredit(email: string): Promise<{
  consumed: boolean;
  remaining: number;
  is_subscribed: boolean;
}> {
  const current = await getCreditSnapshot(email);
  if (current.is_subscribed) {
    return {
      consumed: false,
      remaining: current.freeCredits,
      is_subscribed: true,
    };
  }
  if (current.freeCredits <= 0) {
    return {
      consumed: false,
      remaining: 0,
      is_subscribed: false,
    };
  }
  const nextCredits = 0;
  const account = await saveCreditState(email, {
    free_credits: nextCredits,
    signup_bonus_granted: true,
  });
  const wrote = await writeCloudCredits(email, nextCredits, account.is_subscribed);
  const verified = await getCreditSnapshot(email);
  if (verified.freeCredits !== nextCredits) {
    throw new Error("無料枠の更新がデータベースに反映されませんでした。");
  }
  if (!wrote && (await supabaseHeaders())) {
    console.error("[profiles] consume wrote local only; cloud update failed", email);
  }
  return {
    consumed: true,
    remaining: verified.freeCredits,
    is_subscribed: verified.is_subscribed,
  };
}

export async function getAccountWithCredits(email: string) {
  const snap = await getCreditSnapshot(email);
  return {
    ...snap.account,
    free_credits: snap.freeCredits,
    signup_bonus_granted: snap.signupBonusGranted,
  };
}

export { getAccount };
