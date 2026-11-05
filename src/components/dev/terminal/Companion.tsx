import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { SkinName } from "./commands";
import type { Mood } from "./useTerminal";
import { AHNAF, CAT, CAT_SHADES, PALETTE, toRects, type AhnafPose, type CatPose, type Sprite } from "./sprites";
import { holdWander, initialWander, noticeWander, stepWander, type WanderBounds, type WanderState } from "./wander";

const BLINK_EVERY_MS: readonly [number, number] = [3000, 4000];
const BLINK_MS = 150;
const TURN_EVERY_MS: readonly [number, number] = [8000, 12_000];
const TURN_MS = 1500;
const PURR_MS = 2000;
const NOTICE_CHANCE = 0.6; // how often the cat reacts when the visitor starts typing
const SETTLE_MS = 80; // each leg's transition finishes this much before the leg ends
const HOP_CROUCH_MS = CAT.default.hop.ms; // the crouch frame shows before the cat leaves the ground
// Rendered sizes, in px (Tailwind h-12 / h-8 on 32- and 24-row grids).
const AHNAF_H = 48;
const AHNAF_W = (AHNAF.default.idle.w / AHNAF.default.idle.h) * AHNAF_H;
const AHNAF_RIGHT = 24; // right-6
const CAT_H = 32;
const CAT_W = (CAT.default.sit.w / CAT.default.sit.h) * CAT_H;
/** On the bottom edge the cat's clear top rows tuck into the log's bottom padding. */
const BOTTOM_TUCK = 8;
// Ambient-motion timer keys; purr is state, so it is not among them.
const AMBIENT = ["blink", "blink-end", "turn", "turn-end", "wander", "ahnaf-frame", "cat-frame"];
const PHASE_POSE: Record<WanderState["phase"], CatPose> = {
  walk: "walk",
  hop: "hop",
  look: "look",
  yawn: "yawn",
  sleep: "sleep",
  sit: "sit",
  stretch: "stretch",
  groom: "groom",
  tail: "tail-flick",
};
const between = ([lo, hi]: readonly [number, number]) => lo + Math.random() * (hi - lo);

/**
 * One keyed scheduler for every timer the companions use; re-arming a key
 * replaces it. `pause` freezes every timer with its remaining time and
 * `resume` re-arms them; `now` is a clock that stands still while paused.
 */
function createTimers() {
  type Entry = { fn: () => void; ms: number; repeat: boolean; left: number; due: number; id?: ReturnType<typeof setTimeout> };
  const entries = new Map<string, Entry>();
  let pausedAt: number | null = null;
  let pausedTotal = 0;
  const arm = (key: string, e: Entry) => {
    e.due = Date.now() + e.left;
    e.id = setTimeout(() => {
      if (e.repeat) {
        e.left = e.ms;
        arm(key, e);
      } else entries.delete(key);
      e.fn();
    }, e.left);
  };
  const add = (key: string, ms: number, fn: () => void, repeat: boolean) => {
    cancel(key);
    const e: Entry = { fn, ms, repeat, left: ms, due: 0 };
    entries.set(key, e);
    if (pausedAt === null) arm(key, e);
  };
  const cancel = (key: string) => {
    const e = entries.get(key);
    if (!e) return;
    clearTimeout(e.id);
    entries.delete(key);
  };
  return {
    after: (key: string, ms: number, fn: () => void) => add(key, ms, fn, false),
    every: (key: string, ms: number, fn: () => void) => add(key, ms, fn, true),
    cancel,
    clear() {
      for (const key of [...entries.keys()]) cancel(key);
    },
    pause() {
      if (pausedAt !== null) return;
      pausedAt = Date.now();
      for (const e of entries.values()) {
        clearTimeout(e.id);
        e.left = Math.max(0, e.due - pausedAt);
      }
    },
    resume() {
      if (pausedAt === null) return;
      pausedTotal += Date.now() - pausedAt;
      pausedAt = null;
      for (const [key, e] of entries) arm(key, e);
    },
    now: () => (pausedAt ?? Date.now()) - pausedTotal,
  };
}

type Timers = ReturnType<typeof createTimers>;

/** The frame a sprite is on: it restarts at 0 whenever the sprite changes and only runs when `run`. */
function useFrame(timers: Timers, key: string, sprite: Sprite, run: boolean): number {
  const [state, setState] = useState({ sprite, frame: 0 });
  useEffect(() => {
    setState({ sprite, frame: 0 });
    const n = sprite.frames.length;
    if (!run || n < 2 || !sprite.ms) return;
    let frame = 0;
    timers.every(key, sprite.ms, () => {
      frame = sprite.loop ? (frame + 1) % n : frame + 1;
      if (!sprite.loop && frame >= n - 1) timers.cancel(key); // a one-shot holds its last frame
      setState({ sprite, frame });
    });
    return () => timers.cancel(key);
  }, [timers, key, sprite, run]);
  return state.sprite === sprite ? state.frame : 0;
}

interface Size {
  w: number;
  h: number;
}

/** The right-hand corners line up with the right edge's column, so hops go straight down and up. */
const cornerX = (w: number) => Math.max(0, w - CAT_W / 2);
const boundsOf = ({ w, h }: Size): WanderBounds => ({
  topWidth: cornerX(w),
  rightHeight: h + CAT_H - BOTTOM_TUCK,
  bottomWidth: cornerX(w),
});

/** Where the cat waits when it is not roaming: on the title bar, just left of Ahnaf. */
const homeX = ({ w }: Size) => Math.max(0, w - AHNAF_RIGHT - AHNAF_W - 4 - CAT_W);

/** Card-relative px for a point along an edge (see wander.ts for the tracks). */
function catXY(s: Pick<WanderState, "edge" | "x">, size: Size): [number, number] {
  const b = boundsOf(size);
  if (s.edge === "top") return [Math.min(s.x, b.topWidth), -CAT_H];
  if (s.edge === "bottom") return [Math.min(s.x, b.bottomWidth), size.h - BOTTOM_TUCK];
  // straddling the right border: half outside the card, half over the log's right padding
  return [cornerX(size.w), -CAT_H + Math.min(s.x, b.rightHeight)];
}

const round = (n: number) => Math.round(n * 100) / 100;

function PixelSprite(props: {
  who: "ahnaf" | "cat";
  sprite: Sprite;
  pose: string;
  frame?: number;
  className: string;
  style?: CSSProperties;
  shades?: boolean;
}) {
  const { who, sprite, pose, frame = 0, className, style, shades } = props;
  const rects = useMemo(() => toRects(sprite.frames[frame] ?? sprite.frames[0], PALETTE), [sprite, frame]);
  return (
    <svg
      data-sprite={who}
      data-pose={pose}
      data-frame={frame}
      data-shades={shades ? "true" : undefined}
      viewBox={`0 0 ${sprite.w} ${sprite.h}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      className={className}
      style={style}
    >
      {rects.map((r) => (
        <rect key={`${r.x},${r.y}`} x={r.x} y={r.y} width={1} height={1} style={{ fill: r.fill }} />
      ))}
    </svg>
  );
}

export function Companions(props: {
  mood: Mood;
  skin: SkinName;
  shades: boolean;
  active: boolean;
  petTick: number;
  reduceMotion: boolean;
}) {
  const { mood, skin, shades, active, petTick, reduceMotion } = props;
  const [timers] = useState(createTimers);
  const [blink, setBlink] = useState(false);
  const [turn, setTurn] = useState(false);
  const [wander, setWander] = useState<WanderState | null>(null);
  const [purr, setPurr] = useState(false);
  const [size, setSize] = useState<Size>({ w: 0, h: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef(size);
  const wanderRef = useRef<WanderState | null>(null);
  const commitRef = useRef<((next: WanderState) => void) | null>(null);
  const lastPetTick = useRef(petTick);
  const moodRef = useRef(mood);

  // The wrapper fills the card, so its box is the cat's territory.
  useLayoutEffect(() => {
    const measure = () => {
      const el = wrapperRef.current;
      if (!el) return;
      const next = { w: el.offsetWidth, h: el.offsetHeight };
      sizeRef.current = next;
      setSize((prev) => (prev.w === next.w && prev.h === next.h ? prev : next));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Hidden tab: freeze every timer (and the wander clock) until visible again.
  useEffect(() => {
    const sync = () => (document.hidden ? timers.pause() : timers.resume());
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      timers.clear();
    };
  }, [timers]);

  // Always-on ambient motion: Ahnaf's blinks and glances, the cat's wander loop.
  useEffect(() => {
    if (reduceMotion) return;
    // blinks and head turns only show on the idle face
    const occasionally = (key: string, every: readonly [number, number], ms: number, set: (on: boolean) => void) => {
      const arm = () =>
        timers.after(key, between(every), () => {
          arm();
          if (moodRef.current !== "idle") return;
          set(true);
          timers.after(`${key}-end`, ms, () => set(false));
        });
      arm();
    };
    occasionally("blink", BLINK_EVERY_MS, BLINK_MS, setBlink);
    occasionally("turn", TURN_EVERY_MS, TURN_MS, setTurn);

    const commit = (next: WanderState) => {
      wanderRef.current = next;
      setWander(next);
      timers.after("wander", Math.max(0, next.until - timers.now()), () =>
        commit(stepWander(wanderRef.current!, timers.now(), boundsOf(sizeRef.current), Math.random)),
      );
    };
    commitRef.current = commit;
    commit(initialWander(timers.now(), boundsOf(sizeRef.current), Math.random, homeX(sizeRef.current)));

    return () => {
      for (const key of AMBIENT) timers.cancel(key);
      wanderRef.current = null;
      commitRef.current = null;
      setWander(null);
      setBlink(false);
      setTurn(false);
    };
  }, [reduceMotion, timers]);

  // When the visitor starts typing the cat often notices: a napper wakes, a sitter looks over.
  useEffect(() => {
    const was = moodRef.current;
    moodRef.current = mood;
    if (mood !== "typing" || was === "typing" || !active) return;
    const s = wanderRef.current;
    if (!s || Math.random() >= NOTICE_CHANCE) return;
    const next = noticeWander(s, timers.now());
    if (next !== s) commitRef.current?.(next);
  }, [mood, active, timers]);

  // Petting is state, not ambient motion: it shows even under reduced motion.
  // A roaming cat stops where it is for the purr (a hop in mid-air lands first).
  useEffect(() => {
    if (petTick === lastPetTick.current) return;
    lastPetTick.current = petTick;
    setPurr(true);
    timers.after("purr", PURR_MS, () => setPurr(false));
    const s = wanderRef.current;
    if (s) {
      const held = holdWander(s, timers.now(), PURR_MS);
      if (held !== s) commitRef.current?.(held);
    }
  }, [petTick, timers]);

  const ahnafPose: AhnafPose = shades
    ? "shades"
    : mood === "idle"
      ? blink
        ? "blink"
        : turn
          ? "turn"
          : "idle"
      : mood === "typing"
        ? active
          ? "typing" // eyes on the prompt, hands on the keys
          : "idle"
        : mood;
  const ahnafSprite = AHNAF[skin][ahnafPose];
  const ahnafFrame = useFrame(timers, "ahnaf-frame", ahnafSprite, !reduceMotion);

  const roam = reduceMotion ? null : wander;
  const phase = roam?.phase ?? "sit";
  const moving = phase === "walk" || phase === "hop";
  const catPose: CatPose = moving ? PHASE_POSE[phase] : shades ? "shades" : purr ? "purr" : PHASE_POSE[phase];
  const catSprite = (shades ? CAT_SHADES : CAT)[skin][catPose];
  const catFrame = useFrame(timers, "cat-frame", catSprite, !reduceMotion);

  const [x, y] = catXY(roam ?? { edge: "top", x: homeX(size) }, size);
  const leg = roam ? Math.round(roam.until - roam.since) : 0;
  const catBoxStyle: CSSProperties = {
    transform: `translate(${round(x)}px, ${round(y)}px)`,
    // Only during a leg, so a cat stopped mid-walk snaps to where it is instead
    // of sliding; each leg ends a beat early, so a transition that starts a frame
    // or two late still arrives in time. A hop waits out its crouch first.
    transition:
      phase === "walk"
        ? `transform ${Math.max(0, leg - SETTLE_MS)}ms linear`
        : phase === "hop"
          ? `transform ${Math.max(0, leg - HOP_CROUCH_MS - SETTLE_MS)}ms linear ${HOP_CROUCH_MS}ms`
          : undefined,
  };

  return (
    <div ref={wrapperRef} className="pointer-events-none absolute inset-0">
      <PixelSprite
        who="ahnaf"
        sprite={ahnafSprite}
        pose={ahnafPose}
        frame={ahnafFrame}
        className="absolute right-6 bottom-full h-12 w-auto translate-y-2"
      />
      <div className="absolute top-0 left-0" style={catBoxStyle}>
        <PixelSprite
          who="cat"
          sprite={catSprite}
          pose={catPose}
          frame={catFrame}
          shades={shades}
          className="h-8 w-auto"
          // the sprite faces right; mirror it (instantly, outside the leg's transition) to face left
          style={{ transform: `scaleX(${roam?.facing ?? 1})` }}
        />
      </div>
    </div>
  );
}
