export const ASK_DAILY_CAP = 10;
export const ASK_MAX_CHARS = 300;
export const ASK_TIMEOUT_MS = 15_000;
export const OFFLINE_LINE = "ask is offline right now — try 'help'";
export const CAP_LINE = "daily limit reached (10 questions). email me instead → contact";

const QUOTA_KEY = "portfolio-ask-quota";

export interface Quota {
  date: string; // YYYY-MM-DD, local calendar day
  count: number;
}

export type AskMode = "love" | "normal";

export type AskResult =
  | { ok: true; answer: string; mode: AskMode }
  | { ok: false; reason: "offline" | "cap" | "empty" | "long" };

function localDay(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function parseQuota(raw: string | null, today: string): Quota {
  if (raw === null) return { date: today, count: 0 };
  try {
    const q: unknown = JSON.parse(raw);
    if (
      typeof q === "object" &&
      q !== null &&
      (q as Quota).date === today &&
      typeof (q as Quota).count === "number" &&
      Number.isFinite((q as Quota).count)
    ) {
      return { date: today, count: Math.max(0, (q as Quota).count) };
    }
  } catch {
    // corrupt value: treat as a fresh day
  }
  return { date: today, count: 0 };
}

/** The only code that touches storage. Returns null when storage is missing or throws. */
function updateQuota(storage: Storage | null, now: Date, next?: (q: Quota) => Quota): Quota | null {
  if (!storage) return null;
  try {
    const current = parseQuota(storage.getItem(QUOTA_KEY), localDay(now));
    if (!next) return current;
    const updated = next(current);
    storage.setItem(QUOTA_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return null;
  }
}

export function readQuota(storage: Storage | null, now: Date): Quota {
  return updateQuota(storage, now) ?? { date: localDay(now), count: 0 };
}

export function consumeQuota(storage: Storage | null, now: Date): { allowed: boolean; remaining: number } {
  const current = updateQuota(storage, now);
  if (current && current.count >= ASK_DAILY_CAP) return { allowed: false, remaining: 0 };
  const next = updateQuota(storage, now, (q) => ({ date: q.date, count: q.count + 1 }));
  if (!next) return { allowed: true, remaining: ASK_DAILY_CAP };
  return { allowed: true, remaining: Math.max(0, ASK_DAILY_CAP - next.count) };
}

/** Gives back one question for the day (floor 0), e.g. when the server could not answer. */
export function refundQuota(storage: Storage | null, now: Date): void {
  updateQuota(storage, now, (q) => ({ date: q.date, count: Math.max(0, q.count - 1) }));
}

export function validateQuestion(q: string): { ok: true; question: string } | { ok: false; reason: "empty" | "long" } {
  const question = q.trim();
  if (!question) return { ok: false, reason: "empty" };
  if (question.length > ASK_MAX_CHARS) return { ok: false, reason: "long" };
  return { ok: true, question };
}

export async function askServer(
  question: string,
  deps: { fetch: typeof fetch; signal?: AbortSignal },
): Promise<AskResult> {
  try {
    const res = await deps.fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
      signal: deps.signal,
    });
    if (!res.ok) return { ok: false, reason: "offline" };
    const body: unknown = await res.json();
    const { answer, mode } = typeof body === "object" && body !== null ? (body as { answer?: unknown; mode?: unknown }) : {};
    if (typeof answer !== "string") return { ok: false, reason: "offline" };
    // An older server (or any unknown value) means a normal answer.
    return { ok: true, answer, mode: mode === "love" ? "love" : "normal" };
  } catch {
    return { ok: false, reason: "offline" };
  }
}

export async function ask(
  raw: string,
  deps: { fetch: typeof fetch; storage: Storage | null; now: Date },
): Promise<AskResult> {
  const v = validateQuestion(raw);
  if (!v.ok) return v;
  if (!consumeQuota(deps.storage, deps.now).allowed) return { ok: false, reason: "cap" };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ASK_TIMEOUT_MS);
  try {
    const result = await askServer(v.question, { fetch: deps.fetch, signal: controller.signal });
    // Only answered questions count: outages, timeouts and rate limits give the question back.
    if (!result.ok) refundQuota(deps.storage, deps.now);
    return result;
  } finally {
    clearTimeout(timer);
  }
}
