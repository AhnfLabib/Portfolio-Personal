import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { SkinName } from "./commands";
import type { Mood } from "./useTerminal";
import { AHNAF, CAT, CAT_SHADES, PALETTE, toRects, type AhnafPose, type CatPose, type Sprite } from "./sprites";
import { holdWander, initialWander, noticeWander, stepWander, type WanderState } from "./wander";
import { boundsOf, catBox, type Size } from "./layout";

const BLINK_EVERY_MS: readonly [number, number] = [3000, 4000];
const BLINK_MS = 150;
const TURN_EVERY_MS: readonly [number, number] = [8000, 12_000];
const TURN_MS = 1500;
const PURR_MS = 2000;
const NOTICE_CHANCE = 0.6; // how often the cat reacts when the visitor starts typing
const SETTLE_MS = 80; // each leg's transition finishes this much before the leg ends
const HOP_CROUCH_MS = CAT.default.hop.ms; // the crouch frame shows before the cat leaves the ground
// Ambient-motion timer keys; purr is state, so it is not among them.
const AMBIENT = ["breath", "blink", "blink-end", "turn", "turn-end", "wander", "ahnaf-frame", "cat-frame"];
const BREATH_MS = AHNAF.default.idle.ms;
/** Poses whose two frames are the breath: they follow one shared breathing clock, so switching between them never pops. */
const BREATHING: ReadonlySet<AhnafPose> = new Set(["idle", "blink", "turn", "shades"]);
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

/** The frame a sprite is on: it restarts at 0 whenever the sprite (or `restart`) changes and only runs when `run`. */
function useFrame(timers: Timers, key: string, sprite: Sprite, run: boolean, restart: unknown = null): number {
  const [state, setState] = useState({ sprite, restart, frame: 0 });
  useEffect(() => {
    setState({ sprite, restart, frame: 0 });
    const n = sprite.frames.length;
    if (!run || n < 2 || !sprite.ms) return;
    let frame = 0;
    timers.every(key, sprite.ms, () => {
      frame = sprite.loop ? (frame + 1) % n : frame + 1;
      if (!sprite.loop && frame >= n - 1) timers.cancel(key); // a one-shot holds its last frame
      setState({ sprite, restart, frame });
    });
    return () => timers.cancel(key);
  }, [timers, key, sprite, run, restart]);
  return state.sprite === sprite && state.restart === restart ? state.frame : 0;
}

const round = (n: number) => Math.round(n * 100) / 100;

const PixelSprite = memo(function PixelSprite(props: {
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
});

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
  const [breath, setBreath] = useState(0);
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
    timers.every("breath", BREATH_MS, () => setBreath((b) => 1 - b));
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
    commit(initialWander(timers.now(), boundsOf(sizeRef.current), Math.random, 0)); // starts just right of Ahnaf

    return () => {
      for (const key of AMBIENT) timers.cancel(key);
      wanderRef.current = null;
      commitRef.current = null;
      setWander(null);
      setBreath(0);
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
  const breathes = BREATHING.has(ahnafPose);
  const poseFrame = useFrame(timers, "ahnaf-frame", ahnafSprite, !reduceMotion && !breathes);
  const ahnafFrame = reduceMotion ? 0 : breathes ? breath : poseFrame;

  const roam = reduceMotion ? null : wander;
  const phase = roam?.phase ?? "sit";
  const moving = phase === "walk" || phase === "hop";
  const catPose: CatPose = moving ? PHASE_POSE[phase] : shades ? "shades" : purr ? "purr" : PHASE_POSE[phase];
  const catSprite = (shades ? CAT_SHADES : CAT)[skin][catPose];
  // every hop step crouches again: a new step restarts the hop's frames
  const catFrame = useFrame(timers, "cat-frame", catSprite, !reduceMotion, phase === "hop" ? roam?.since : null);

  const facing = roam?.facing ?? 1;
  // Stable per facing, so the memoized cat sprite re-renders only on pose/frame/facing changes.
  const catSpriteStyle = useMemo<CSSProperties>(() => ({ transform: `scaleX(${facing})` }), [facing]);
  const { x, y } = catBox(roam ?? { edge: "top", x: 0 }, size);
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
        className="absolute left-4 bottom-full h-12 w-auto translate-y-2"
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
          style={catSpriteStyle}
        />
      </div>
    </div>
  );
}
