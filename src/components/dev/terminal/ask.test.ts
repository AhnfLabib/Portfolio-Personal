import { describe, it, expect, vi } from "vitest";
import { readQuota, consumeQuota, validateQuestion, askServer, ask } from "./ask";

function memStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    getItem: (k: string) => (m.has(k) ? (m.get(k) as string) : null),
    key: (i: number) => Array.from(m.keys())[i] ?? null,
    removeItem: (k: string) => void m.delete(k),
    setItem: (k: string, v: string) => void m.set(k, String(v)),
  };
}

describe("quota", () => {
  it("quota starts at 0 and resets on a new day", () => {
    const s = memStorage();
    expect(readQuota(s, new Date("2026-11-05T10:00"))).toEqual({ date: "2026-11-05", count: 0 });
    for (let i = 0; i < 9; i++) consumeQuota(s, new Date("2026-11-05T10:00"));
    expect(consumeQuota(s, new Date("2026-11-05T10:00"))).toEqual({ allowed: true, remaining: 0 });
    expect(consumeQuota(s, new Date("2026-11-05T23:59")).allowed).toBe(false);
    expect(s.getItem("portfolio-ask-quota")).not.toBeNull();
    expect(consumeQuota(s, new Date("2026-11-06T00:01")).allowed).toBe(true);
  });
  it("quota works with null storage (never blocks)", () => {
    expect(consumeQuota(null, new Date()).allowed).toBe(true);
  });
  it("quota never blocks when storage throws", () => {
    const boom = (): never => {
      throw new Error("denied");
    };
    const s = { ...memStorage(), getItem: boom, setItem: boom } as Storage;
    for (let i = 0; i < 12; i++) expect(consumeQuota(s, new Date()).allowed).toBe(true);
    expect(readQuota(s, new Date()).count).toBe(0);
  });
});

describe("validateQuestion", () => {
  it("validation rejects empty and >300", () => {
    expect(validateQuestion("   ")).toEqual({ ok: false, reason: "empty" });
    expect(validateQuestion("x".repeat(301))).toEqual({ ok: false, reason: "long" });
  });
});

describe("ask", () => {
  it("invalid questions do not consume quota", async () => {
    const s = memStorage();
    await ask("", { fetch: vi.fn(), storage: s, now: new Date() });
    expect(readQuota(s, new Date()).count).toBe(0);
  });
  it("askServer maps a rejecting fetch to offline immediately", async () => {
    const t = Date.now();
    const r = await askServer("hi", { fetch: vi.fn().mockRejectedValue(new Error("net")) });
    expect(r).toEqual({ ok: false, reason: "offline" });
    expect(Date.now() - t).toBeLessThan(100);
  });
  it("askServer maps non-200 and bad JSON to offline, 200 {answer} to ok", async () => {
    const bad = vi.fn().mockResolvedValue(new Response("nope", { status: 503 }));
    expect(await askServer("hi", { fetch: bad })).toEqual({ ok: false, reason: "offline" });
    const notJson = vi.fn().mockResolvedValue(new Response("not json", { status: 200 }));
    expect(await askServer("hi", { fetch: notJson })).toEqual({ ok: false, reason: "offline" });
    const good = vi.fn().mockResolvedValue(Response.json({ answer: "I build things." }));
    const signal = new AbortController().signal;
    expect(await askServer("hi", { fetch: good, signal })).toEqual({ ok: true, answer: "I build things." });
    expect(good).toHaveBeenCalledWith(
      "/api/ask",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "hi" }),
        signal,
      }),
    );
  });
  it("ask over the cap returns cap without calling fetch", async () => {
    const s = memStorage();
    const f = vi.fn();
    for (let i = 0; i < 10; i++) consumeQuota(s, new Date());
    expect(await ask("hi", { fetch: f, storage: s, now: new Date() })).toEqual({ ok: false, reason: "cap" });
    expect(f).not.toHaveBeenCalled();
  });
});
