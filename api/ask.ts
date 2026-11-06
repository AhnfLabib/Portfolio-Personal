import { LOVE_MODE_LINE, buildSystemPrompt } from "./_context.js";

export const MODEL = "gemini-3.1-flash-lite";
export const RATE_LIMIT = { perHour: 20 };

const MAX_CHARS = 300;
const TIMEOUT_MS = 15_000;
const WINDOW_MS = 3_600_000;
// This project's *.vercel.app hosts: production alias and preview deployments
// (`portfolio-personal-<hash>-<scope>`, `portfolio-personal-git-<branch>-<scope>`).
const PREVIEW_HOST = /^portfolio-personal(?:-[a-z0-9-]+)?\.vercel\.app$/;
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

export type AskMode = "love" | "normal";

const LOVE_WORDS = /\b(love|girlfriend|gf|partner|crush|prono|sadiya|dating|relationship|wife|marry|married|valentine)\b/i;

/**
 * True when the question is about Ahnaf's love life or his girlfriend. Deliberately simple:
 * "I love your projects" matches too, which is fine — love mode only changes the tone and the cat.
 */
export function isLoveQuestion(q: string): boolean {
  return LOVE_WORDS.test(q) || /who\s+do\s+you\s+love/i.test(q);
}

/** The only code that knows Gemini's request/response shape. Throws on any failure. */
export async function callProvider(
  question: string,
  deps: { fetch: typeof fetch; apiKey: string; signal: AbortSignal },
  mode: AskMode = "normal",
): Promise<string> {
  const system = [{ text: buildSystemPrompt() }, ...(mode === "love" ? [{ text: LOVE_MODE_LINE }] : [])];
  const send = (thinking: boolean) =>
    deps.fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": deps.apiKey },
      body: JSON.stringify({
        system_instruction: { parts: system },
        contents: [{ role: "user", parts: [{ text: question }] }],
        // Minimal thinking keeps latency low; the larger budget leaves room for any
        // reasoning tokens so a 120-word answer (capped in the system prompt) is never cut.
        generationConfig: {
          maxOutputTokens: 600,
          temperature: 0.4,
          ...(thinking ? { thinkingConfig: { thinkingLevel: "minimal" } } : {}),
        },
      }),
      signal: deps.signal,
    });
  let res = await send(true);
  // If the model rejects the thinking setting, retry once without it rather than fail every ask.
  if (res.status === 400 && /thinking/i.test(await res.text().catch(() => ""))) res = await send(false);
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

/**
 * Cheap cross-origin guard. A browser POST from another site carries its Origin;
 * allow only this deployment's own host and this project's *.vercel.app previews.
 * Requests without an Origin header (curl, server-side callers) pass.
 */
export function originAllowed(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  let host: string;
  try {
    host = new URL(origin).host;
  } catch {
    return false;
  }
  if (host === new URL(req.url).host) return true;
  return PREVIEW_HOST.test(host);
}

export async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return error("method not allowed", 405);
  if (!originAllowed(req)) return error("forbidden", 403);

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
    const mode: AskMode = isLoveQuestion(question) ? "love" : "normal";
    const answer = await callProvider(question, { fetch: globalThis.fetch, apiKey, signal: controller.signal }, mode);
    return Response.json({ answer, mode });
  } catch {
    return error("ask is unavailable", 502);
  } finally {
    clearTimeout(timer);
  }
}

// Vercel's Node runtime Web-standard export shape.
export default { fetch: handler };
