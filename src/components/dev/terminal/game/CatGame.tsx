import { useEffect, useId, useRef, useState, type FocusEvent, type JSX, type KeyboardEvent, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import type { SkinName } from "../commands";
import { CAT, CAT_SHADES } from "../sprites";
import { MAX_DT, WORLD, createGame, jump, step, type GameState } from "./engine";
import { render, resolvePalette, type Assets, type Colours } from "./draw";

export const BEST_KEY = "portfolio-cat-best";
const FRAME = 1 / 60;
const JUMP_CODES = new Set(["Space", "ArrowUp", "KeyW", "Enter"]);
const JUMP_KEYS = new Set([" ", "ArrowUp", "w", "W", "Enter"]);
const isJump = (e: KeyboardEvent) => JUMP_CODES.has(e.code) || JUMP_KEYS.has(e.key);
const pad = (n: number) => String(n).padStart(3, "0");

/** Private mode and disabled storage throw: the game plays on without a best score. */
function readBest(): number {
  try {
    const n = Number.parseInt(localStorage.getItem(BEST_KEY) ?? "", 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}
function writeBest(n: number) {
  try {
    localStorage.setItem(BEST_KEY, String(n));
  } catch {
    // storage unavailable: keep the best for this open only
  }
}

export interface CatGameProps {
  open: boolean;
  onClose(): void;
  skin: SkinName;
  shades: boolean;
  reduceMotion: boolean;
  /** The element whose computed style supplies the palette tokens (the terminal wrapper). */
  paletteFrom: Element | null;
  /** Where focus goes when the game closes: the cat button, or the terminal input after `play`. */
  returnFocusTo: HTMLElement | null;
}

/** Cat Dash: a modal one-button runner, portalled to the body. Mounting it is an "open", so state resets each time. */
export function CatGame(props: CatGameProps): JSX.Element | null {
  if (!props.open) return null;
  return createPortal(<GameDialog {...props} />, document.body);
}

function GameDialog({ onClose, skin, shades, reduceMotion, paletteFrom, returnFocusTo }: CatGameProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const againRef = useRef<HTMLButtonElement>(null);
  // Read once per open.
  const [initialBest] = useState(readBest);
  const [colours] = useState<Colours>(() => resolvePalette(paletteFrom ?? document.documentElement));
  const [dpr] = useState(() => window.devicePixelRatio || 1);
  const [best, setBest] = useState(initialBest);
  const [airborne, setAirborne] = useState(false);
  const [overScore, setOverScore] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);

  /** The loop's mutable world: the engine state, the accumulator, and what React last saw. */
  const live = useRef({
    s: null as unknown as GameState,
    acc: 0,
    last: null as number | null,
    frame: 0,
    paused: false,
    best: initialBest,
    airborne: false,
    over: false,
  });
  if (live.current.s === null) live.current.s = createGame(initialBest, Math.random);

  const set = (shades ? CAT_SHADES : CAT)[skin];
  const assets = useRef<Omit<Assets, "frame">>(null as unknown as Omit<Assets, "frame">);
  assets.current = { cat: set.walk, hop: set.hop, sleep: set.sleep, colours, reduceMotion };

  /** Tell React what changed in the world: the airborne flag, and game over (with the best score). */
  const sync = () => {
    const L = live.current;
    if (L.s.airborne !== L.airborne) {
      L.airborne = L.s.airborne;
      setAirborne(L.airborne);
    }
    if (L.s.over && !L.over) {
      L.over = true;
      setOverScore(L.s.score);
      if (L.s.score > L.best) {
        L.best = L.s.score;
        setBest(L.best);
        writeBest(L.best);
      }
    }
  };

  // The loop: fixed 1/60 s steps from an accumulator fed by rAF, each gap clamped to MAX_DT.
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d") ?? null;
    const draw = () => {
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      render(ctx, live.current.s, { ...assets.current, frame: live.current.frame });
    };
    let raf = 0;
    const tick = (ts: number) => {
      raf = requestAnimationFrame(tick);
      const L = live.current;
      if (L.paused) {
        L.last = null;
        return;
      }
      const dt = L.last === null ? 0 : Math.min(Math.max(0, (ts - L.last) / 1000), MAX_DT);
      L.last = ts;
      L.acc += dt;
      while (L.acc >= FRAME) {
        L.s = step(L.s, FRAME, Math.random);
        L.acc -= FRAME;
      }
      L.frame++;
      draw();
      sync();
    };
    draw();
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // sync and assets read refs; the loop lives for the whole open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dpr]);

  // Open: lock the page's scroll and focus the game; closing restores the scroll.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    wrapperRef.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const pause = () => {
    const L = live.current;
    if (L.paused || L.s.over) return;
    L.paused = true;
    setPaused(true);
  };
  const resume = () => {
    live.current.paused = false;
    live.current.last = null;
    setPaused(false);
  };

  // A hidden tab pauses; coming back waits for the next input.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) pause();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (overScore !== null) againRef.current?.focus({ preventScroll: true });
  }, [overScore]);

  const restart = () => {
    const L = live.current;
    wrapperRef.current?.focus({ preventScroll: true }); // before the focused "again" button goes away
    L.s = createGame(L.best, Math.random);
    L.acc = 0;
    L.last = null;
    L.over = false;
    L.airborne = false;
    L.paused = false;
    setOverScore(null);
    setAirborne(false);
    setPaused(false);
  };

  /** The one button: resume if paused, restart if over, else jump. */
  const press = () => {
    const L = live.current;
    if (L.paused) resume();
    else if (L.s.over) restart();
    else {
      L.s = jump(L.s);
      sync();
    }
  };

  const close = () => {
    // Focus goes back first, so the terminal sees it land on the cat or its input, never on the page.
    if (returnFocusTo?.isConnected) returnFocusTo.focus({ preventScroll: true });
    onClose();
  };

  const onPanelKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === "Tab") {
      // Trap focus inside: the close button, the game, and the game-over buttons when shown.
      const panel = panelRef.current;
      if (!panel) return;
      const stops = Array.from(panel.querySelectorAll<HTMLElement>('button, [tabindex="0"]'));
      if (!stops.length) return;
      e.preventDefault();
      const i = stops.indexOf(document.activeElement as HTMLElement);
      const n = stops.length;
      const next = i < 0 ? 0 : (i + (e.shiftKey ? -1 : 1) + n) % n;
      stops[next].focus({ preventScroll: true });
    }
  };
  const onPanelBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!panelRef.current?.contains(e.relatedTarget as Node | null)) pause();
  };
  const onGameKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!isJump(e) || e.repeat) return;
    // A focused button (again / close) handles its own Space and Enter.
    if (e.target !== e.currentTarget && (e.target as Element).closest("button")) return;
    e.preventDefault();
    press();
  };
  const onStagePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest("button")) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    press();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-4 backdrop-blur-sm">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onPanelKeyDown}
        onBlur={onPanelBlur}
        className="w-[min(480px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-line bg-surface shadow-2xl shadow-black/40"
      >
        <div className="flex items-center justify-between border-b border-line bg-surface-2 py-2 pr-2 pl-4">
          <h2 id={titleId} className="font-mono text-xs text-ink-faint">
            cat dash
          </h2>
          <button
            type="button"
            aria-label="close game"
            onClick={close}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm font-mono text-base leading-none text-ink-faint hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            ×
          </button>
        </div>
        <div
          ref={wrapperRef}
          tabIndex={0}
          role="application"
          aria-label="cat dash: press space or tap to jump"
          data-testid="game"
          data-airborne={airborne ? "true" : "false"}
          data-over={overScore !== null ? "true" : "false"}
          data-paused={paused ? "true" : "false"}
          onKeyDown={onGameKeyDown}
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
        >
          <div className="relative touch-manipulation select-none" onPointerDown={onStagePointerDown}>
            <canvas
              ref={canvasRef}
              width={Math.round(WORLD.w * dpr)}
              height={Math.round(WORLD.h * dpr)}
              aria-hidden="true"
              className="block h-auto w-full"
              style={{ imageRendering: "pixelated", aspectRatio: `${WORLD.w} / ${WORLD.h}` }}
            />
            {overScore !== null ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface/60 font-mono text-sm text-ink">
                <p role="status">{`game over · ${overScore}`}</p>
                <div className="flex gap-2">
                  <button
                    ref={againRef}
                    type="button"
                    onClick={restart}
                    className="cursor-pointer rounded-sm border border-accent/60 px-3 py-1 text-xs text-accent hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    again
                  </button>
                  <button
                    type="button"
                    onClick={close}
                    className="cursor-pointer rounded-sm border border-line px-3 py-1 text-xs text-ink-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    close
                  </button>
                </div>
              </div>
            ) : (
              paused && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-surface/60 font-mono text-ink">
                  <p className="text-sm">paused</p>
                  <p className="text-[11px] text-ink-faint">space / tap to resume</p>
                </div>
              )
            )}
          </div>
        </div>
        <p className="border-t border-line px-4 py-2 font-mono text-[11px] text-ink-faint">
          {`space / tap to jump · esc to close · best ${pad(best)}`}
        </p>
      </div>
    </div>
  );
}
