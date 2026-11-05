import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTerminal } from "./useTerminal";
import { IDLE_LINES, HINT_LINE, runCommand } from "./commands";
import { OFFLINE_LINE, CAP_LINE } from "./ask";

function memStorage(seed: Record<string, string> = {}): Storage {
  const m = new Map<string, string>(Object.entries(seed));
  return {
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    getItem: (k: string) => (m.has(k) ? (m.get(k) as string) : null),
    key: (i: number) => Array.from(m.keys())[i] ?? null,
    removeItem: (k: string) => void m.delete(k),
    setItem: vi.fn((k: string, v: string) => void m.set(k, String(v))),
  };
}

type Deps = Parameters<typeof useTerminal>[0];

function setup(deps: Deps = { reduceMotion: true, storage: null }) {
  const hook = renderHook(() => useTerminal(deps));
  const state = () => hook.result.current[0];
  const api = () => hook.result.current[1];
  const run = (input: string) => {
    act(() => api().setInput(input));
    act(() => api().submit());
  };
  return { hook, state, api, run };
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useTerminal", () => {
  it("starts idle with the two idle lines and no hint", () => {
    const { state } = setup();
    expect(state().active).toBe(false);
    expect(state().lines).toEqual(IDLE_LINES);
    expect(state().showHint).toBe(false);
    expect(state().mood).toBe("idle");
    expect(state().busy).toBe(false);
    expect(state().input).toBe("");
  });

  it("activate shows the hint; first submit hides it", () => {
    const { state, api, run } = setup();
    act(() => api().activate());
    expect(state().active).toBe(true);
    expect(state().showHint).toBe(true);
    run("help");
    expect(state().busy).toBe(false);
    expect(state().showHint).toBe(false);
  });

  it("deactivate before anything ran returns to the idle look", () => {
    const { state, api } = setup();
    act(() => api().activate());
    act(() => api().deactivate());
    expect(state().active).toBe(false);
    expect(state().showHint).toBe(false);
    expect(state().lines).toBe(IDLE_LINES);
  });

  it("deactivate after a command keeps the lines", () => {
    const { state, api, run } = setup();
    act(() => api().activate());
    run("whoami");
    const lines = state().lines;
    act(() => api().deactivate());
    expect(state().active).toBe(false);
    expect(state().showHint).toBe(false);
    expect(state().lines).toBe(lines);
  });

  it("submit appends a prompt line then the command output", () => {
    const { state, api, run } = setup();
    act(() => api().activate());
    run("help");
    const help = runCommand("help", { skin: "default" }).lines;
    expect(state().lines).toEqual([...IDLE_LINES, { kind: "prompt", text: "$ help" }, ...help]);
    expect(state().input).toBe("");
    expect(state().lines).not.toContainEqual(HINT_LINE);
  });

  it("typewriter appends output line by line; finishTyping flushes", () => {
    vi.useFakeTimers();
    const { state, api, run } = setup({ typeDelayMs: 50, storage: null });
    const help = runCommand("help", { skin: "default" }).lines;
    run("help");
    const base = IDLE_LINES.length + 1;
    expect(state().lines).toHaveLength(base);
    expect(state().lines[base - 1]).toEqual({ kind: "prompt", text: "$ help" });
    expect(state().busy).toBe(true);
    expect(state().mood).toBe("thinking");
    act(() => vi.advanceTimersByTime(50));
    expect(state().lines).toHaveLength(base + 1);
    act(() => vi.advanceTimersByTime(50));
    expect(state().lines).toHaveLength(base + 2);
    act(() => api().finishTyping());
    expect(state().lines).toHaveLength(base + help.length);
    expect(state().busy).toBe(false);
  });

  it("default typewriter delay is max(30ms, 1.5ms per char)", () => {
    vi.useFakeTimers();
    const { state, run } = setup({ storage: null });
    const ms = Math.max(30, 1.5 * IDLE_LINES[1].text.length); // whoami prints one line
    run("whoami");
    const n = state().lines.length;
    act(() => vi.advanceTimersByTime(ms - 1));
    expect(state().lines).toHaveLength(n);
    act(() => vi.advanceTimersByTime(1));
    expect(state().lines).toHaveLength(n + 1);
    expect(state().busy).toBe(false);
  });

  it("history up/down walks previous inputs and resets on submit", () => {
    const { state, api, run } = setup();
    run("help");
    run("skills");
    act(() => api().historyUp());
    expect(state().input).toBe("skills");
    act(() => api().historyUp());
    expect(state().input).toBe("help");
    act(() => api().historyUp());
    expect(state().input).toBe("help");
    act(() => api().historyDown());
    expect(state().input).toBe("skills");
    act(() => api().historyDown());
    expect(state().input).toBe("");
    act(() => api().historyUp());
    expect(state().input).toBe("skills");
    act(() => api().submit());
    act(() => api().historyUp());
    expect(state().input).toBe("skills");
    act(() => api().historyUp());
    expect(state().input).toBe("skills");
  });

  it("tab completes a unique prefix", () => {
    const { state, api } = setup();
    act(() => api().setInput("exp"));
    act(() => api().tabComplete());
    expect(state().input).toBe("experience");
  });

  it("tab completes several matches to their shared prefix only", () => {
    const { state, api } = setup();
    act(() => api().setInput("s"));
    act(() => api().tabComplete()); // skills, skin, socials, sudo → shared prefix "s"
    expect(state().input).toBe("s");
    act(() => api().setInput("sk"));
    act(() => api().tabComplete()); // skills, skin → "ski"
    expect(state().input).toBe("ski");
  });

  it("clear empties lines (not back to idle lines)", () => {
    const { state, api, run } = setup();
    run("help");
    act(() => api().clear());
    expect(state().lines).toEqual([]);
    run("whoami");
    run("clear");
    expect(state().lines).toEqual([]);
  });

  it("clear cancels an in-flight typewriter", () => {
    vi.useFakeTimers();
    const { state, api, run } = setup({ typeDelayMs: 50, storage: null });
    run("help");
    act(() => api().clear());
    expect(state().lines).toEqual([]);
    expect(state().busy).toBe(false);
    act(() => vi.advanceTimersByTime(5000));
    expect(state().lines).toEqual([]);
  });

  it("skin effect persists to storage; shades does not", () => {
    const storage = memStorage();
    const { state, run } = setup({ reduceMotion: true, storage });
    run("skin hacker");
    expect(state().skin).toBe("hacker");
    expect(storage.getItem("portfolio-terminal-skin")).toBe("hacker");
    vi.mocked(storage.setItem).mockClear();
    run("sudo x");
    expect(state().shades).toBe(true);
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.getItem("portfolio-terminal-skin")).toBe("hacker");
  });

  it("reads the initial skin from storage, ignoring unknown values", () => {
    expect(setup({ reduceMotion: true, storage: memStorage({ "portfolio-terminal-skin": "artist" }) }).state().skin).toBe("artist");
    expect(setup({ reduceMotion: true, storage: memStorage({ "portfolio-terminal-skin": "bogus" }) }).state().skin).toBe("default");
  });

  it("survives a storage that throws", () => {
    const storage = memStorage();
    storage.getItem = () => {
      throw new Error("denied");
    };
    vi.mocked(storage.setItem).mockImplementation(() => {
      throw new Error("denied");
    });
    const { state, run } = setup({ reduceMotion: true, storage });
    expect(state().skin).toBe("default");
    run("skin hacker");
    expect(state().skin).toBe("hacker");
  });

  it("ask: busy during fetch, offline line on failure, mood confused", async () => {
    const pending = deferred<Response>();
    const fetch = vi.fn(() => pending.promise) as unknown as typeof globalThis.fetch;
    const { state, run } = setup({ reduceMotion: true, storage: null, fetch });
    run("ask what do you do?");
    expect(state().busy).toBe(true);
    expect(state().mood).toBe("thinking");
    expect(fetch).toHaveBeenCalledOnce();
    await act(async () => pending.reject(new Error("network")));
    expect(state().busy).toBe(false);
    expect(state().lines.at(-1)).toEqual({ kind: "error", text: OFFLINE_LINE });
    expect(state().mood).toBe("confused");
  });

  it("ask: answer line on success, mood happy", async () => {
    const fetch = vi.fn(async () => Response.json({ answer: "i build agents" })) as unknown as typeof globalThis.fetch;
    const { state, api } = setup({ reduceMotion: true, storage: null, fetch });
    act(() => api().setInput("ask hi"));
    await act(async () => api().submit());
    expect(state().busy).toBe(false);
    expect(state().lines.at(-1)).toEqual({ kind: "text", text: "i build agents" });
    expect(state().mood).toBe("happy");
  });

  it("ask: cap line when the daily quota is used up", async () => {
    const storage = memStorage({ "portfolio-ask-quota": JSON.stringify({ date: "2026-11-05", count: 10 }) });
    const fetch = vi.fn() as unknown as typeof globalThis.fetch;
    const now = () => new Date("2026-11-05T10:00");
    const { state, api } = setup({ reduceMotion: true, storage, fetch, now });
    act(() => api().setInput("ask hi"));
    await act(async () => api().submit());
    expect(fetch).not.toHaveBeenCalled();
    expect(state().lines.at(-1)).toEqual({ kind: "error", text: CAP_LINE });
    expect(state().mood).toBe("confused");
  });

  it("submit while busy is ignored (no second prompt line)", () => {
    vi.useFakeTimers();
    const { state, api } = setup({ typeDelayMs: 50, storage: null });
    act(() => api().setInput("help"));
    act(() => api().submit());
    act(() => api().setInput("help"));
    act(() => api().submit());
    act(() => api().finishTyping());
    expect(state().lines.filter((l) => l.kind === "prompt" && l.text === "$ help")).toHaveLength(1);
  });

  it("pet bumps petTick and sets happy", () => {
    vi.useFakeTimers();
    const { state, run } = setup();
    expect(state().petTick).toBe(0);
    run("pet");
    expect(state().petTick).toBe(1);
    expect(state().mood).toBe("happy");
    act(() => vi.advanceTimersByTime(1499));
    expect(state().mood).toBe("happy");
    act(() => vi.advanceTimersByTime(1));
    expect(state().mood).toBe("idle");
  });

  it("moods: typing while active with input, confused for 2000ms after a failed command", () => {
    vi.useFakeTimers();
    const { state, api, run } = setup();
    act(() => api().setInput("he"));
    expect(state().mood).toBe("idle"); // not active
    act(() => api().activate());
    expect(state().mood).toBe("typing");
    run("nope");
    expect(state().mood).toBe("confused");
    act(() => vi.advanceTimersByTime(1999));
    expect(state().mood).toBe("confused");
    act(() => vi.advanceTimersByTime(1));
    expect(state().mood).toBe("idle");
  });

  it("open effect opens a new tab", () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    const { run } = setup();
    run("resume");
    expect(open).toHaveBeenCalledWith("/resume.pdf", "_blank", "noopener");
  });

  it("clears pending timers on unmount", () => {
    vi.useFakeTimers();
    const { hook, run } = setup({ typeDelayMs: 50, storage: null });
    run("help");
    hook.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
