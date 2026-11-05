// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fn, { MODEL, RATE_LIMIT, callProvider, checkRate, handler } from "./ask.js";
import { buildSystemPrompt } from "./_context.js";

const post = (body: unknown, ip = "1.1.1.1", extra: Record<string, string> = {}) =>
  new Request("http://x/api/ask", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip, ...extra },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

const geminiOk = (text: string) =>
  new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

let ipCounter = 0;
const freshIp = () => `10.0.0.${++ipCounter}`;

beforeEach(() => {
  vi.stubEnv("GEMINI_API_KEY", "test-key");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("handler validation", () => {
  it("rejects GET with 405", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const res = await handler(new Request("http://x/api/ask"));
    expect(res.status).toBe(405);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await res.json()).toHaveProperty("error");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("the default export is Vercel's { fetch } shape and routes to the handler", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    expect(typeof fn.fetch).toBe("function");
    const res = await fn.fetch(new Request("http://x/api/ask", { method: "GET" }));
    expect(res.status).toBe(405);
    expect(await res.json()).toEqual({ error: "method not allowed" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects non-JSON and missing question with 400 and never calls fetch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    for (const body of ["{not json", { q: 1 }, { question: 5 }, "null", "  "]) {
      const res = await handler(post(body, freshIp()));
      expect(res.status).toBe(400);
      expect(res.headers.get("content-type")).toContain("application/json");
      expect(typeof (await res.json()).error).toBe("string");
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects an empty (whitespace-only) question with 400", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const res = await handler(post({ question: "   " }, freshIp()));
    expect(res.status).toBe(400);
    expect(typeof (await res.json()).error).toBe("string");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects >300 chars with 400", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const res = await handler(post({ question: "a".repeat(301) }, freshIp()));
    expect(res.status).toBe(400);
    expect(typeof (await res.json()).error).toBe("string");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("accepts exactly 300 chars (after trimming)", async () => {
    const fetchSpy = vi.fn(async () => geminiOk("ok"));
    vi.stubGlobal("fetch", fetchSpy);
    const res = await handler(post({ question: `  ${"a".repeat(300)}  ` }, freshIp()));
    expect(res.status).toBe(200);
    const body = JSON.parse(String((fetchSpy.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.contents[0].parts[0].text).toBe("a".repeat(300));
  });

  it("503 when GEMINI_API_KEY is unset", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const res = await handler(post({ question: "What does Ahnaf do?" }, freshIp()));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "ask is not configured" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("origin check", () => {
  it("same-origin and missing Origin pass; a foreign Origin gets 403 before the provider", async () => {
    const fetchSpy = vi.fn(async () => geminiOk("ok"));
    vi.stubGlobal("fetch", fetchSpy);
    expect((await handler(post({ question: "hi" }, freshIp(), { origin: "http://x" }))).status).toBe(200);
    expect((await handler(post({ question: "hi" }, freshIp()))).status).toBe(200);
    expect(
      (await handler(post({ question: "hi" }, freshIp(), { origin: "https://portfolio-personal-git-main-ahnf.vercel.app" })))
        .status,
    ).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(3);

    for (const origin of ["https://evil.example", "https://someone-else.vercel.app", "null"]) {
      const res = await handler(post({ question: "hi" }, freshIp(), { origin }));
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: "forbidden" });
    }
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });
});

describe("checkRate", () => {
  it("rate limits the 21st request in an hour per ip with 429", async () => {
    const store = new Map<string, { windowStart: number; count: number }>();
    const t0 = 1_000_000;
    expect(RATE_LIMIT.perHour).toBe(20);
    for (let i = 0; i < 20; i++) expect(checkRate("a", t0 + i, store)).toBe(true);
    expect(checkRate("a", t0 + 100, store)).toBe(false);
    expect(checkRate("b", t0 + 100, store)).toBe(true);
    expect(checkRate("a", t0 + 3_600_001, store)).toBe(true);

    // And through the handler with the module-level store.
    const fetchSpy = vi.fn(async () => geminiOk("hi"));
    vi.stubGlobal("fetch", fetchSpy);
    const ip = freshIp();
    for (let i = 0; i < 20; i++) {
      expect((await handler(post({ question: "hi" }, `${ip}, 9.9.9.9`))).status).toBe(200);
    }
    const res = await handler(post({ question: "hi" }, ip));
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: "too many questions, try again later" });
    expect(fetchSpy).toHaveBeenCalledTimes(20);
  });
});

describe("provider", () => {
  it("maps provider failure to 502 {error} and success to 200 {answer}", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("boom", { status: 500 })));
    let res = await handler(post({ question: "Where does Ahnaf work?" }, freshIp()));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "ask is unavailable" });

    const fetchSpy = vi.fn(async () => geminiOk("  He works at Bridge Builder Strategies.  "));
    vi.stubGlobal("fetch", fetchSpy);
    res = await handler(post({ question: "  Where does Ahnaf work?  " }, freshIp()));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await res.json()).toEqual({ answer: "He works at Bridge Builder Strategies." });

    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`);
    expect(init.method).toBe("POST");
    const headers = new Headers(init.headers);
    expect(headers.get("x-goog-api-key")).toBe("test-key");
    expect(headers.get("content-type")).toBe("application/json");
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(String(init.body))).toEqual({
      system_instruction: { parts: [{ text: buildSystemPrompt() }] },
      contents: [{ role: "user", parts: [{ text: "Where does Ahnaf work?" }] }],
      generationConfig: { maxOutputTokens: 600, temperature: 0.4, thinkingConfig: { thinkingLevel: "minimal" } },
    });
  });

  it("maps a thrown fetch, missing candidates and an empty answer to 502", async () => {
    const bodies = [
      () => Promise.reject(new TypeError("network")),
      async () => new Response(JSON.stringify({}), { status: 200 }),
      async () => new Response(JSON.stringify({ candidates: [] }), { status: 200 }),
      async () => geminiOk("   "),
      async () => new Response("not json", { status: 200 }),
    ];
    for (const impl of bodies) {
      vi.stubGlobal("fetch", vi.fn(impl));
      const res = await handler(post({ question: "hi" }, freshIp()));
      expect(res.status).toBe(502);
      expect(await res.json()).toEqual({ error: "ask is unavailable" });
    }
  });

  it("times out after 15 s and returns 502", async () => {
    vi.useFakeTimers();
    try {
      vi.stubGlobal(
        "fetch",
        vi.fn(
          (_url: string, init: RequestInit) =>
            new Promise<Response>((_resolve, reject) => {
              init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
            }),
        ),
      );
      const pending = handler(post({ question: "hi" }, freshIp()));
      await vi.advanceTimersByTimeAsync(15_000);
      const res = await pending;
      expect(res.status).toBe(502);
      expect(await res.json()).toEqual({ error: "ask is unavailable" });
    } finally {
      vi.useRealTimers();
    }
  });

  it("callProvider joins parts and uses the injected deps", async () => {
    const fetchSpy = vi.fn(
      async () =>
        new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "a" }, { text: "b" }] } }] }), {
          status: 200,
        }),
    );
    const answer = await callProvider("q", {
      fetch: fetchSpy as unknown as typeof fetch,
      apiKey: "k",
      signal: new AbortController().signal,
    });
    expect(answer).toBe("ab");
  });
});

describe("buildSystemPrompt", () => {
  it("buildSystemPrompt names the current employer and the rules", () => {
    const p = buildSystemPrompt();
    expect(p).toContain("Bridge Builder Strategies");
    expect(p).toMatch(/120 words/);
    expect(p).toMatch(/help/);
    expect(p).toMatch(/markdown/i);
    expect(p).toContain("3.77");
    expect(p).toContain("ahnaflabib212@gmail.com");
    expect(p).toContain("NCAA Final Four Analytics Challenge");
    expect(p).toContain("Q.");
  });
});
