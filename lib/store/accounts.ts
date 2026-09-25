import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { isValidEmail, normalizeEmail } from "@/lib/auth/session";
import { inputFingerprint, isSavedPlan } from "@/lib/history";
import { LIMIT_MESSAGE, MAX_PROPOSALS } from "@/lib/proposals-limits";
import type { SavedPlan } from "@/lib/types";

export { LIMIT_MESSAGE, MAX_PROPOSALS };

export type AccountRecord = {
  email: string;
  is_subscribed: boolean;
  stripe_customer_id: string | null;
  stripe_session_id: string | null;
  subscribed_at: string | null;
  proposals: SavedPlan[];
  free_credits: number;
  signup_bonus_granted: boolean;
};

type StoreFile = {
  accounts: Record<string, AccountRecord>;
};

export class LimitReachedError extends Error {
  oldest: SavedPlan | null;

  constructor(oldest: SavedPlan | null) {
    super(LIMIT_MESSAGE);
    this.name = "LimitReachedError";
    this.oldest = oldest;
  }
}

function emptyStore(): StoreFile {
  return { accounts: {} };
}

function dataDir() {
  const configured = process.env.DATA_DIR?.trim();
  if (configured) return configured;
  if (process.env.VERCEL) return "/tmp";
  return path.join(process.cwd(), "data");
}

function storePath() {
  return path.join(dataDir(), "accounts.json");
}

function emptyAccount(email: string): AccountRecord {
  return {
    email,
    is_subscribed: false,
    stripe_customer_id: null,
    stripe_session_id: null,
    subscribed_at: null,
    proposals: [],
    free_credits: 0,
    signup_bonus_granted: false,
  };
}

function sortPlans(plans: SavedPlan[]) {
  return [...plans].sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
  );
}

function oldestPlan(plans: SavedPlan[]) {
  if (plans.length === 0) return null;
  return [...plans].sort(
    (a, b) => new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime(),
  )[0] ?? null;
}

function normalizeAccount(value: unknown, email: string): AccountRecord {
  const record =
    value && typeof value === "object" ? (value as Partial<AccountRecord>) : {};
  const proposals = Array.isArray(record.proposals)
    ? record.proposals.filter(isSavedPlan)
    : [];
  const creditsRaw = Number(record.free_credits);
  return {
    email,
    is_subscribed: Boolean(record.is_subscribed),
    stripe_customer_id:
      typeof record.stripe_customer_id === "string"
        ? record.stripe_customer_id
        : null,
    stripe_session_id:
      typeof record.stripe_session_id === "string"
        ? record.stripe_session_id
        : null,
    subscribed_at:
      typeof record.subscribed_at === "string" ? record.subscribed_at : null,
    proposals: sortPlans(proposals).slice(0, MAX_PROPOSALS),
    free_credits: Number.isFinite(creditsRaw) ? Math.max(0, Math.trunc(creditsRaw)) : 0,
    signup_bonus_granted: Boolean(record.signup_bonus_granted),
  };
}

let writeChain: Promise<unknown> = Promise.resolve();

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeChain.then(fn, fn);
  writeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await readFile(storePath(), "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return emptyStore();
    const accounts = (parsed as StoreFile).accounts;
    if (!accounts || typeof accounts !== "object") return emptyStore();
    const next: StoreFile = { accounts: {} };
    for (const [key, value] of Object.entries(accounts)) {
      const email = normalizeEmail(key);
      if (!isValidEmail(email)) continue;
      next.accounts[email] = normalizeAccount(value, email);
    }
    return next;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return emptyStore();
    }
    throw error;
  }
}

async function writeStore(store: StoreFile) {
  const dir = dataDir();
  await mkdir(dir, { recursive: true });
  await writeFile(storePath(), `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

export async function getAccount(email: string): Promise<AccountRecord | null> {
  const key = normalizeEmail(email);
  if (!isValidEmail(key)) return null;
  const store = await readStore();
  return store.accounts[key] ?? null;
}

export async function ensureAccount(email: string): Promise<AccountRecord> {
  return enqueue(async () => {
    const key = normalizeEmail(email);
    if (!isValidEmail(key)) {
      throw new Error("メールアドレスが正しくありません。");
    }
    const store = await readStore();
    const existing = store.accounts[key];
    if (existing) return existing;
    const created = emptyAccount(key);
    store.accounts[key] = created;
    await writeStore(store);
    return created;
  });
}

export async function setSubscribed(
  email: string,
  is_subscribed: boolean,
): Promise<AccountRecord | null> {
  const key = normalizeEmail(email);
  if (!isValidEmail(key)) return null;
  return enqueue(async () => {
    const store = await readStore();
    const account = store.accounts[key] ?? emptyAccount(key);
    account.is_subscribed = is_subscribed;
    if (is_subscribed) {
      account.subscribed_at = account.subscribed_at ?? new Date().toISOString();
    }
    store.accounts[key] = account;
    await writeStore(store);
    return account;
  });
}

export async function markSubscribed(
  email: string,
  details: {
    stripe_customer_id?: string | null;
    stripe_session_id?: string | null;
  },
): Promise<AccountRecord | null> {
  const key = normalizeEmail(email);
  if (!isValidEmail(key)) return null;
  return enqueue(async () => {
    const store = await readStore();
    const account = store.accounts[key] ?? emptyAccount(key);
    account.is_subscribed = true;
    account.stripe_customer_id =
      details.stripe_customer_id ?? account.stripe_customer_id;
    account.stripe_session_id =
      details.stripe_session_id ?? account.stripe_session_id;
    account.subscribed_at = account.subscribed_at ?? new Date().toISOString();
    store.accounts[key] = account;
    await writeStore(store);
    return account;
  });
}

export async function listProposals(email: string): Promise<SavedPlan[]> {
  const account = await getAccount(email);
  return account?.proposals ?? [];
}

export async function getProposal(
  email: string,
  id: string,
): Promise<SavedPlan | null> {
  const proposals = await listProposals(email);
  return proposals.find((plan) => plan.id === id) ?? null;
}

export async function saveProposal(
  email: string,
  plan: SavedPlan,
  _options?: { replaceOldest?: boolean },
): Promise<{ plan: SavedPlan; proposals: SavedPlan[]; replacedId?: string }> {
  if (!isSavedPlan(plan)) {
    throw new Error("保存データの形式が正しくありません。");
  }
  return enqueue(async () => {
    const key = normalizeEmail(email);
    const store = await readStore();
    const account = store.accounts[key] ?? emptyAccount(key);
    const fingerprint = inputFingerprint(plan);
    const duplicate = account.proposals.find(
      (item) => inputFingerprint(item) === fingerprint,
    );
    let replacedId: string | undefined;
    const nextPlan: SavedPlan = duplicate
      ? { ...plan, id: duplicate.id, savedAt: new Date().toISOString() }
      : plan;

    if (duplicate) {
      account.proposals = account.proposals.filter((item) => item.id !== duplicate.id);
      account.proposals.unshift(nextPlan);
    } else {
      const existingIndex = account.proposals.findIndex((item) => item.id === nextPlan.id);
      if (existingIndex >= 0) {
        account.proposals[existingIndex] = nextPlan;
      } else if (account.proposals.length >= MAX_PROPOSALS) {
        const oldest = oldestPlan(account.proposals);
        if (oldest) {
          account.proposals = account.proposals.filter((item) => item.id !== oldest.id);
          replacedId = oldest.id;
        }
        account.proposals.unshift(nextPlan);
      } else {
        account.proposals.unshift(nextPlan);
      }
    }

    account.proposals = sortPlans(account.proposals).slice(0, MAX_PROPOSALS);
    store.accounts[key] = account;
    await writeStore(store);
    return { plan: nextPlan, proposals: account.proposals, replacedId };
  });
}

export async function saveCreditState(
  email: string,
  patch: { free_credits: number; signup_bonus_granted?: boolean },
): Promise<AccountRecord> {
  const key = normalizeEmail(email);
  if (!isValidEmail(key)) {
    throw new Error("メールアドレスが正しくありません。");
  }
  return enqueue(async () => {
    const store = await readStore();
    const account = store.accounts[key] ?? emptyAccount(key);
    account.free_credits = Math.max(0, Math.trunc(patch.free_credits));
    if (typeof patch.signup_bonus_granted === "boolean") {
      account.signup_bonus_granted = patch.signup_bonus_granted;
    }
    store.accounts[key] = account;
    await writeStore(store);
    return account;
  });
}

export async function deleteProposal(email: string, id: string): Promise<SavedPlan[]> {
  return enqueue(async () => {
    const key = normalizeEmail(email);
    const store = await readStore();
    const account = store.accounts[key];
    if (!account) return [];
    account.proposals = account.proposals.filter((item) => item.id !== id);
    store.accounts[key] = account;
    await writeStore(store);
    return account.proposals;
  });
}
