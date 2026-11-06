import { useEffect, useReducer, useRef, useState } from "react";
import { complete, IDLE_LINES, runCommand, SKINS, type Line, type SkinName } from "./commands";
import { ask, CAP_LINE, OFFLINE_LINE, type AskResult } from "./ask";

export interface TerminalState {
  active: boolean;
  lines: Line[];
  input: string;
  busy: boolean;
  /** An `ask` is in flight: from its start until its answer line is appended. */
  asking: boolean;
  /** How the last `ask` ended; null while one is in flight, before any, or after `clear`. */
  askOutcome: "ok" | "fail" | null;
  skin: SkinName;
  shades: boolean;
  petTick: number;
  /** Bumped when an `ask` answer comes back in love mode (the cat goes lovey). */
  loveTick: number;
  showHint: boolean;
}

export interface TerminalApi {
  activate(): void;
  deactivate(): void;
  setInput(v: string): void;
  submit(): void;
  historyUp(): void;
  historyDown(): void;
  /** Completes the input; true when it changed (so the caller may swallow Tab). */
  tabComplete(): boolean;
  clear(): void;
  finishTyping(): void; // skip typewriter
}

export interface TerminalDeps {
  fetch?: typeof fetch;
  storage?: Storage | null;
  reduceMotion?: boolean;
  now?: () => Date;
  typeDelayMs?: number;
}

const SKIN_KEY = "portfolio-terminal-skin";
interface Internal extends TerminalState {
  history: string[];
  cursor: number; // index into history; history.length means "fresh input"
}

type Action =
  | { type: "activate" }
  | { type: "deactivate" }
  | { type: "input"; value: string }
  | { type: "start"; input: string }
  | { type: "append"; lines: Line[]; love?: boolean }
  | { type: "done" }
  | { type: "asking" }
  | { type: "asked"; ok: boolean }
  | { type: "clear" }
  | { type: "skin"; skin: SkinName }
  | { type: "shades" }
  | { type: "pet" }
  | { type: "historyUp" }
  | { type: "historyDown" }
  | { type: "tab" };

function sharedPrefix(words: string[]): string {
  let p = words[0] ?? "";
  for (const w of words) while (!w.startsWith(p)) p = p.slice(0, -1);
  return p;
}

function reducer(s: Internal, a: Action): Internal {
  switch (a.type) {
    case "activate":
      return { ...s, active: true, showHint: s.lines === IDLE_LINES };
    case "deactivate":
      // After `clear`, leaving the card shows the idle lines again rather than a bare prompt.
      return s.lines.length === 0
        ? { ...s, active: false, showHint: false, lines: IDLE_LINES }
        : { ...s, active: false, showHint: false };
    case "input":
      return { ...s, input: a.value };
    case "start": {
      const history = a.input.trim() === "" ? s.history : [...s.history, a.input];
      return {
        ...s,
        lines: [...s.lines, { kind: "prompt", text: `$ ${a.input}` }],
        input: "",
        busy: true,
        showHint: false,
        history,
        cursor: history.length,
      };
    }
    case "append":
      return { ...s, lines: [...s.lines, ...a.lines], loveTick: a.love ? s.loveTick + 1 : s.loveTick };
    case "done":
      return { ...s, busy: false };
    case "asking":
      return { ...s, asking: true, askOutcome: null };
    case "asked":
      return { ...s, asking: false, askOutcome: a.ok ? "ok" : "fail" };
    case "clear":
      return { ...s, lines: [], busy: false, asking: false, askOutcome: null };
    case "skin":
      return { ...s, skin: a.skin };
    case "shades":
      return { ...s, shades: true };
    case "pet":
      return { ...s, petTick: s.petTick + 1 };
    case "historyUp":
      return s.cursor > 0 ? { ...s, cursor: s.cursor - 1, input: s.history[s.cursor - 1] } : s;
    case "historyDown": {
      if (s.cursor >= s.history.length) return s;
      const cursor = s.cursor + 1;
      return { ...s, cursor, input: cursor === s.history.length ? "" : s.history[cursor] };
    }
    case "tab": {
      if (s.input === "") return s;
      const p = sharedPrefix(complete(s.input));
      return p.length > s.input.length ? { ...s, input: p } : s;
    }
  }
}

function resolveStorage(storage: Storage | null | undefined): Storage | null {
  if (storage !== undefined) return storage;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function init(storage: Storage | null): Internal {
  let skin: SkinName = "default";
  try {
    const saved = storage?.getItem(SKIN_KEY);
    if (saved && (SKINS as readonly string[]).includes(saved)) skin = saved as SkinName;
  } catch {
    // unreadable storage: keep the default skin
  }
  return {
    active: false,
    lines: IDLE_LINES,
    input: "",
    busy: false,
    asking: false,
    askOutcome: null,
    skin,
    shades: false,
    petTick: 0,
    loveTick: 0,
    showHint: false,
    history: [],
    cursor: 0,
  };
}

function askLine(r: AskResult): Line {
  if (r.ok) return { kind: "text", text: r.answer };
  if (r.reason === "offline") return { kind: "error", text: OFFLINE_LINE };
  if (r.reason === "cap") return { kind: "error", text: CAP_LINE };
  return { kind: "hint", text: "usage: ask <question> (max 300 characters)" };
}

export function useTerminal(deps: TerminalDeps = {}): [TerminalState, TerminalApi] {
  const depsRef = useRef(deps);
  useEffect(() => {
    depsRef.current = deps;
  });

  const [storage] = useState(() => resolveStorage(deps.storage));
  const [state, rawDispatch] = useReducer(reducer, storage, init);

  // Mutable runtime: a synchronous mirror of the reducer state (so back-to-back
  // calls see each other's effects), the typewriter queue and the timers.
  const rt = useRef({
    live: state,
    queue: [] as Line[],
    onDone: null as (() => void) | null,
    typeTimer: null as ReturnType<typeof setTimeout> | null,
    gen: 0, // bumped by clear() and unmount; stale ask results are dropped
  });

  const [api] = useState<TerminalApi>(() => {
    const r = rt.current;
    const dispatch = (a: Action) => {
      r.live = reducer(r.live, a);
      rawDispatch(a);
    };

    const stopTyping = () => {
      if (r.typeTimer) clearTimeout(r.typeTimer);
      r.typeTimer = null;
      r.queue = [];
      r.onDone = null;
    };

    const flushTyping = () => {
      const { queue, onDone } = r;
      stopTyping();
      if (queue.length) dispatch({ type: "append", lines: queue });
      onDone?.();
    };

    const delayFor = (line: Line) => {
      const d = depsRef.current;
      if (d.reduceMotion) return 0;
      return d.typeDelayMs ?? Math.max(30, 1.5 * line.text.length);
    };

    const step = () => {
      const next = r.queue[0];
      const ms = next === undefined ? 0 : delayFor(next);
      if (ms <= 0) return flushTyping();
      r.typeTimer = setTimeout(() => {
        r.typeTimer = null;
        r.queue.shift();
        dispatch({ type: "append", lines: [next] });
        step();
      }, ms);
    };

    const typeOut = (lines: Line[], onDone: () => void) => {
      r.queue = [...lines];
      r.onDone = onDone;
      step();
    };

    const finish = () => dispatch({ type: "done" });

    const runAsk = async (question: string) => {
      const gen = r.gen;
      const d = depsRef.current;
      dispatch({ type: "asking" });
      let result: AskResult;
      try {
        result = await ask(question, {
          fetch: d.fetch ?? ((...args: Parameters<typeof fetch>) => globalThis.fetch(...args)),
          storage,
          now: (d.now ?? (() => new Date()))(),
        });
      } catch {
        result = { ok: false, reason: "offline" };
      }
      if (gen !== r.gen) return;
      dispatch({ type: "append", lines: [askLine(result)], love: result.ok && result.mode === "love" });
      dispatch({ type: "asked", ok: result.ok });
      finish();
    };

    const clear = () => {
      stopTyping();
      r.gen++;
      dispatch({ type: "clear" });
    };

    return {
      activate: () => dispatch({ type: "activate" }),
      deactivate: () => dispatch({ type: "deactivate" }),
      setInput: (value) => dispatch({ type: "input", value }),
      historyUp: () => dispatch({ type: "historyUp" }),
      historyDown: () => dispatch({ type: "historyDown" }),
      tabComplete: () => {
        const before = r.live.input;
        dispatch({ type: "tab" });
        return r.live.input !== before;
      },
      clear,
      finishTyping: flushTyping,
      submit: () => {
        const { busy, input, skin } = r.live;
        if (busy) return;
        const result = runCommand(input, { skin });
        dispatch({ type: "start", input });
        if (input.trim() === "") return dispatch({ type: "done" });

        let question: string | null = null;
        for (const e of result.effects) {
          switch (e.type) {
            case "clear":
              clear();
              break;
            case "skin":
              dispatch({ type: "skin", skin: e.skin });
              try {
                storage?.setItem(SKIN_KEY, e.skin);
              } catch {
                // storage full or blocked: the skin still applies for this session
              }
              break;
            case "shades":
              dispatch({ type: "shades" });
              break;
            case "pet":
              dispatch({ type: "pet" });
              break;
            case "open":
              if (typeof window !== "undefined" && typeof window.open === "function") {
                window.open(e.href, "_blank", "noopener");
              }
              break;
            case "ask":
              question = e.question;
              break;
          }
        }
        typeOut(result.lines, () => (question === null ? finish() : void runAsk(question)));
      },
    };
  });

  useEffect(() => {
    const r = rt.current;
    return () => {
      if (r.typeTimer) clearTimeout(r.typeTimer);
      r.typeTimer = null;
      r.queue = [];
      r.onDone = null;
      r.gen++;
    };
  }, []);

  const { history: _history, cursor: _cursor, ...visible } = state;
  return [visible, api];
}
