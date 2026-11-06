// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fn, { MODEL, RATE_LIMIT, callProvider, checkRate, handler, isLoveQuestion } from "./ask.js";
import { LOVE_MODE_LINE, buildSystemPrompt } from "./_context.js";

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
    expect(await res.json()).toEqual({ answer: "He works at Bridge Builder Strategies.", mode: "normal" });

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

  it("retries once without thinkingConfig when Gemini rejects the thinking setting with 400", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: 'Unknown name "thinkingLevel"' } }), { status: 400 }),
      )
      .mockResolvedValueOnce(geminiOk("He builds agents."));
    vi.stubGlobal("fetch", fetchSpy);
    const res = await handler(post({ question: "hi" }, freshIp()));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ answer: "He builds agents.", mode: "normal" });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const [first, second] = fetchSpy.mock.calls.map((c) => JSON.parse(String((c[1] as RequestInit).body)));
    expect(first.generationConfig.thinkingConfig).toEqual({ thinkingLevel: "minimal" });
    expect(second.generationConfig).toEqual({ maxOutputTokens: 600, temperature: 0.4 });
    expect(second.contents).toEqual(first.contents);
    expect(second.system_instruction).toEqual(first.system_instruction);
    expect((fetchSpy.mock.calls[1][1] as RequestInit).signal).toBe((fetchSpy.mock.calls[0][1] as RequestInit).signal);
  });

  it("does not retry a 400 unrelated to thinking, and retries at most once", async () => {
    let fetchSpy = vi.fn(async () => new Response(JSON.stringify({ error: { message: "bad request" } }), { status: 400 }));
    vi.stubGlobal("fetch", fetchSpy);
    let res = await handler(post({ question: "hi" }, freshIp()));
    expect(res.status).toBe(502);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    fetchSpy = vi.fn(async () => new Response("thinking is not supported", { status: 400 }));
    vi.stubGlobal("fetch", fetchSpy);
    res = await handler(post({ question: "hi" }, freshIp()));
    expect(res.status).toBe(502);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
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

describe("love mode", () => {
  it("isLoveQuestion: love-life questions match, case-insensitively", () => {
    for (const q of [
      "who is Prono?",
      "tell me about sadiya",
      "does ahnaf have a girlfriend",
      "who do you love",
      "Is he DATING anyone?",
      "is he married?",
      "SADIYA?",
      "he loves her",
      "how many girlfriends has he had",
      "is he seeing anyone",
      "any crushes?",
      // Documented positive: the regex stays simple; love mode only changes tone and the cat.
      "I love your projects",
    ]) {
      expect(isLoveQuestion(q), q).toBe(true);
    }
  });

  it("isLoveQuestion: ordinary questions do not match", () => {
    for (const q of ["what do you do", "where does Ahnaf work?", "what are his partnerships", "lovely site", "skills?"]) {
      expect(isLoveQuestion(q), q).toBe(false);
    }
  });

  it("a love question gets the extra system line and mode love; others get mode normal and one line", async () => {
    const fetchSpy = vi.fn(async () => geminiOk("She is his girlfriend! ♥"));
    vi.stubGlobal("fetch", fetchSpy);
    let res = await handler(post({ question: "who is Prono?" }, freshIp()));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ answer: "She is his girlfriend! ♥", mode: "love" });
    let body = JSON.parse(String((fetchSpy.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.system_instruction).toEqual({ parts: [{ text: buildSystemPrompt() }, { text: LOVE_MODE_LINE }] });

    res = await handler(post({ question: "what do you do" }, freshIp()));
    expect(await res.json()).toEqual({ answer: "She is his girlfriend! ♥", mode: "normal" });
    body = JSON.parse(String((fetchSpy.mock.calls[1] as unknown as [string, RequestInit])[1].body));
    expect(body.system_instruction).toEqual({ parts: [{ text: buildSystemPrompt() }] });
  });

  it("the love-mode thinking retry keeps the love system line", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(new Response("thinking not supported", { status: 400 }))
      .mockResolvedValueOnce(geminiOk("aww"));
    const answer = await callProvider(
      "sadiya?",
      { fetch: fetchSpy as unknown as typeof fetch, apiKey: "k", signal: new AbortController().signal },
      "love",
    );
    expect(answer).toBe("aww");
    const second = JSON.parse(String((fetchSpy.mock.calls[1][1] as RequestInit).body));
    expect(second.system_instruction.parts[1]).toEqual({ text: LOVE_MODE_LINE });
  });

  it("the system prompt carries the girlfriend fact and the never-unprompted rule", () => {
    const p = buildSystemPrompt();
    expect(p).toContain('Girlfriend: Sadiya (nickname "Prono"). Ahnaf adores her.');
    expect(p).toContain("Otherwise never bring her up unprompted.");
    expect(LOVE_MODE_LINE).toMatch(/fan-girl mode/);
    // Conditional, so a loose match ("I love your projects") never brings her up unprompted.
    expect(LOVE_MODE_LINE).toContain("If it isn't");
    expect(LOVE_MODE_LINE).toContain("do not mention her");
    expect(LOVE_MODE_LINE).toMatch(/120 words/);
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
