import { buildSystemPrompt } from "./_context";

export const MODEL = "gemini-3.1-flash-lite";
export const RATE_LIMIT = { perHour: 20 };

const MAX_CHARS = 300;
const TIMEOUT_MS = 15_000;
const WINDOW_MS = 3_600_000;
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

type RateEntry = { windowStart: number; count: number };
const rateStore = new Map<string, RateEntry>();

/** True when `ip` may ask another question; counts the attempt. */
export function checkRate(ip: string, now: number, store: Map<string, RateEntry> = rateStore): boolean {
  const entry = store.get(ip);
  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    store.set(ip, { windowStart: now, count: 1 });
    return true;
  }
  if (entry.count >= RATE_LIMIT.perHour) return false;
  entry.count += 1;
  return true;
}

/** The only code that knows Gemini's request/response shape. Throws on any failure. */
export async function callProvider(
  question: string,
  deps: { fetch: typeof fetch; apiKey: string; signal: AbortSignal },
): Promise<string> {
  const res = await deps.fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": deps.apiKey },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: buildSystemPrompt() }] },
      contents: [{ role: "user", parts: [{ text: question }] }],
      generationConfig: { maxOutputTokens: 300, temperature: 0.4 },
    }),
    signal: deps.signal,
  });
  if (!res.ok) throw new Error(`provider status ${res.status}`);
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: unknown }[] } }[];
  };
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) throw new Error("provider returned no candidates");
  const answer = parts
    .map((p) => (typeof p?.text === "string" ? p.text : ""))
    .join("")
    .trim();
  if (!answer) throw new Error("provider returned an empty answer");
  return answer;
}

const error = (message: string, status: number) => Response.json({ error: message }, { status });

async function readQuestion(req: Request): Promise<string | null> {
  try {
    const body: unknown = await req.json();
    const q = typeof body === "object" && body !== null ? (body as { question?: unknown }).question : undefined;
    return typeof q === "string" ? q : null;
  } catch {
    return null;
  }
}

function clientIp(req: Request): string {
  const first = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return first || "unknown";
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return error("method not allowed", 405);

  const raw = await readQuestion(req);
  if (raw === null) return error("expected JSON body with a string question", 400);
  const question = raw.trim();
  if (!question) return error("question is empty", 400);
  if (question.length > MAX_CHARS) return error(`question is longer than ${MAX_CHARS} characters`, 400);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return error("ask is not configured", 503);

  if (!checkRate(clientIp(req), Date.now())) return error("too many questions, try again later", 429);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const answer = await callProvider(question, { fetch: globalThis.fetch, apiKey, signal: controller.signal });
    return Response.json({ answer });
  } catch {
    return error("ask is unavailable", 502);
  } finally {
    clearTimeout(timer);
  }
}
