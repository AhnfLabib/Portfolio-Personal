import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import type { SkinName } from "./commands";
import { CAT, CAT_SHADES, PALETTE, toRects, type CatPose, type Sprite } from "./sprites";
import { attendWander, holdWander, initialWander, stepTowardWander, stepWander, type WanderState } from "./wander";
import { boundsOf, catBox, type Size } from "./layout";
import { facingFor, zoneFor, type Point, type Zone } from "./proximity";

const PURR_MS = 2000;
const SETTLE_MS = 80; // each leg's transition finishes this much before the leg ends
const HOP_CROUCH_MS = CAT.default.hop.ms; // the crouch frame shows before the cat leaves the ground
// Cursor nearby
const LOOK_UP_PX = 24; // the cursor this far above the cat's top: it looks up
const RELEASE_MS: readonly [number, number] = [1000, 2000]; // after the cursor leaves, then it wanders on
const CHATTER_MS: readonly [number, number] = [4000, 10_000];
const CHATTER = ["meow", "mrrp", "...", "?"] as const;
const BUBBLE_MS = 1500;
const MAX_STEPS = 2; // per visit, 8 px each
const STEP_MS = 300;
const PAW_MS = CAT.default.paw.ms * CAT.default.paw.frames.length; // one 300 ms swipe
const PAW_EVERY_MS = 2000;
// An ask in flight, then the answer
const HAPPY_MS = 1000;
// Love (loveTick)
const LOVE_MS = 4000;
// Clicks: a hop and "!" the first time, then these in turn
const HOP_REACT_MS = 600;
const REACTIONS = [
  { pose: "purr", ms: PURR_MS },
  { pose: "slow-blink", ms: 1500 },
  { pose: "stretch", ms: 1500 },
] as const;
// Ambient-motion timer keys (purr, reactions and bubbles are state, so they are not among them).
const AMBIENT = ["wander", "cat-frame"];
const TRACKING = ["chatter", "release", "paw", "step"];
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
  attend: "look-r",
};
/** Poses drawn already facing their way (look-l is look-r mirrored), so the sprite is never flipped for them. */
const ORIENTED: ReadonlySet<CatPose> = new Set(["look-l", "look-r"]);
const between = ([lo, hi]: readonly [number, number]) => lo + Math.random() * (hi - lo);
type Gaze = "l" | "r" | "up";
type Reaction = "hop-react" | "slow-blink" | "stretch";

/**
 * One keyed scheduler for every timer the companions use; re-arming a key
 * replaces it. `pause` freezes every timer with its remaining time and
 * `resume` re-arms them; `now` is a clock that stands still while paused.
 */
function createTimers() {
  type Entry = {
    fn: () => void;
    ms: number;
    repeat: boolean;
    left: number;
    due: number;
    id?: ReturnType<typeof setTimeout>;
  };
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
  sprite: Sprite;
  pose: string;
  frame?: number;
  className: string;
  style?: CSSProperties;
  shades?: boolean;
}) {
  const { sprite, pose, frame = 0, className, style, shades } = props;
  const rects = useMemo(() => toRects(sprite.frames[frame] ?? sprite.frames[0], PALETTE), [sprite, frame]);
  return (
    <svg
      data-sprite="cat"
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

const preventDefault = (e: { preventDefault(): void }) => e.preventDefault();

/** Only a pointer that can hover gets the nearby-cursor behaviour; touch-only devices just tap. */
const canHover = () => typeof window.matchMedia === "function" && window.matchMedia("(hover: hover)").matches;

export function Companions(props: {
  skin: SkinName;
  shades: boolean;
  petTick: number;
  reduceMotion: boolean;
  /** An `ask` is in flight: the cat stops, faces the prompt and thinks; a happy beat when it ends. */
  thinking: boolean;
  /** How the last ask ended: the happy beat plays only after "ok". */
  askOutcome?: "ok" | "fail" | null;
  /** Each change shows the love pose for 4 s with a ♥ bubble (wired to the AI answer in a later task). */
  loveTick?: number;
  /** Called on every click/tap of the cat (after its reaction); the hook for a later mini-game. */
  onCatClick?: () => void;
}) {
  const { skin, shades, petTick, reduceMotion, thinking, askOutcome = null, loveTick = 0, onCatClick } = props;
  const [timers] = useState(createTimers);
  const [wander, setWander] = useState<WanderState | null>(null);
  const [purr, setPurr] = useState(false);
  const [reaction, setReaction] = useState<Reaction | null>(null);
  const [bubble, setBubble] = useState<string | null>(null);
  const [gaze, setGaze] = useState<Gaze>("r");
  const [paw, setPaw] = useState(false);
  const [stepping, setStepping] = useState(false);
  const [happy, setHappy] = useState(false);
  const [love, setLove] = useState(false);
  const [size, setSize] = useState<Size>({ w: 0, h: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const sizeRef = useRef(size);
  const wanderRef = useRef<WanderState | null>(null);
  const commitRef = useRef<((next: WanderState) => void) | null>(null);
  const lastPetTick = useRef(petTick);
  const lastLoveTick = useRef(loveTick);
  const thinkingRef = useRef(thinking);
  /** Re-runs the cursor check from the last pointer position (set by the tracking effect). */
  const recheckRef = useRef<(() => void) | null>(null);
  const clicks = useRef(0);

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

  // The wander loop (ambient motion).
  useEffect(() => {
    if (reduceMotion) return;
    const commit = (step: WanderState) => {
      const prev = wanderRef.current;
      // while thinking it holds still facing the prompt (a hop in mid-air lands first)
      const next = thinkingRef.current ? attendWander(step, timers.now(), -1) : step;
      wanderRef.current = next;
      setWander(next);
      // attending the cursor holds until the tracking says otherwise
      if (!Number.isFinite(next.until)) timers.cancel("wander");
      else
        timers.after("wander", Math.max(0, next.until - timers.now()), () =>
          commit(stepWander(wanderRef.current!, timers.now(), boundsOf(sizeRef.current), Math.random)),
        );
      // Leaving attend (or think) while the cursor rests: its zone may be stale, so look again (last: it may commit).
      if (prev?.phase === "attend" && next.phase !== "attend") recheckRef.current?.();
    };
    commitRef.current = commit;
    commit(initialWander(timers.now(), boundsOf(sizeRef.current), Math.random, 0));

    return () => {
      for (const key of AMBIENT) timers.cancel(key);
      wanderRef.current = null;
      commitRef.current = null;
      setWander(null);
    };
  }, [reduceMotion, timers]);

  const say = useCallback(
    (word: string) => {
      setBubble(word);
      timers.after("bubble", BUBBLE_MS, () => setBubble(null));
    },
    [timers],
  );

  /** Stop a roaming cat where it is for `ms` (a hop in mid-air lands first; one attending the cursor keeps attending). */
  const hold = useCallback(
    (ms: number) => {
      const s = wanderRef.current;
      if (!s || s.phase === "attend") return;
      const held = holdWander(s, timers.now(), ms);
      if (held !== s) commitRef.current?.(held);
    },
    [timers],
  );

  const startPurr = useCallback(() => {
    setPurr(true);
    timers.after("purr", PURR_MS, () => setPurr(false));
    hold(PURR_MS);
  }, [timers, hold]);

  // The cursor nearby: track it on hover-capable pointers, with motion allowed.
  useEffect(() => {
    if (reduceMotion || !canHover()) return;
    let zone: Zone = "far";
    let steps = 0;
    let busyUntil = -Infinity; // a step or a swipe in progress
    let lastPaw = -Infinity;
    let raf = 0;
    let last: Point | null = null;

    const chatter = () =>
      timers.after("chatter", between(CHATTER_MS), () => {
        if (!thinkingRef.current) say(CHATTER[Math.min(CHATTER.length - 1, Math.floor(Math.random() * CHATTER.length))]);
        chatter();
      });

    const track = (p: Point) => {
      const el = buttonRef.current;
      const s = wanderRef.current;
      const commit = commitRef.current;
      if (!el || !s || !commit) return;
      const r = el.getBoundingClientRect(); // cheap, and right even mid-transition
      const box = { x: r.left, y: r.top, w: r.width, h: r.height };
      const was = zone;
      zone = zoneFor(p, box);
      const now = timers.now();
      if (zone === "far") {
        if (was === "far") return;
        timers.cancel("chatter");
        timers.cancel("bubble");
        setBubble(null);
        timers.after("release", between(RELEASE_MS), () => {
          const cur = wanderRef.current;
          if (cur?.phase === "attend") commitRef.current?.(stepWander(cur, timers.now(), boundsOf(sizeRef.current), Math.random));
        });
        return;
      }
      if (was === "far") {
        timers.cancel("release");
        steps = 0;
        chatter();
      }
      if (thinkingRef.current) return; // busy thinking: it ignores the cursor
      const facing = facingFor(p, box);
      setGaze(p.y < box.y - LOOK_UP_PX ? "up" : facing < 0 ? "l" : "r");
      if (now < busyUntil) return; // let the step or swipe finish
      let next = attendWander(s, now, facing);
      if (zone === "close" && next.phase === "attend") {
        // along the cat's edge: sideways on the top and bottom, up/down on the right
        const vertical = next.edge === "right";
        const off = vertical ? p.y - (box.y + box.h / 2) : p.x - (box.x + box.w / 2);
        if (steps < MAX_STEPS && Math.abs(off) > (vertical ? box.h : box.w) / 2) {
          steps++;
          next = stepTowardWander(next, now, off < 0 ? -1 : 1, boundsOf(sizeRef.current));
          busyUntil = now + STEP_MS;
          setStepping(true);
          timers.after("step", STEP_MS, () => setStepping(false));
        } else if (now - lastPaw >= PAW_EVERY_MS) {
          lastPaw = now;
          busyUntil = now + PAW_MS;
          setPaw(true);
          timers.after("paw", PAW_MS, () => setPaw(false));
        }
      }
      if (next !== s) commit(next);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      last = { x: e.clientX, y: e.clientY };
      if (!raf)
        raf = requestAnimationFrame(() => {
          raf = 0;
          if (last) track(last);
        });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    recheckRef.current = () => {
      if (last) track(last);
    };
    return () => {
      recheckRef.current = null;
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
      for (const key of TRACKING) timers.cancel(key);
      setPaw(false);
      setStepping(false);
      setGaze("r");
    };
  }, [reduceMotion, timers, say]);

  // An ask in flight: stop and think, facing the prompt; when it lands, a happy beat, then wander on.
  useEffect(() => {
    if (thinkingRef.current === thinking) return;
    thinkingRef.current = thinking;
    const s = wanderRef.current;
    if (thinking) {
      timers.cancel("happy");
      setHappy(false);
      if (s) commitRef.current?.(s); // commit re-applies the thinking hold
      return;
    }
    // a beat in place either way; the happy face only when the answer came through
    if (askOutcome === "ok") {
      setHappy(true);
      timers.after("happy", HAPPY_MS, () => setHappy(false));
    }
    if (s) commitRef.current?.(holdWander(s, timers.now(), HAPPY_MS));
  }, [thinking, askOutcome, timers]);

  // Love is state too: 4 s of it, with a heart.
  useEffect(() => {
    if (loveTick === lastLoveTick.current) return;
    lastLoveTick.current = loveTick;
    setLove(true);
    timers.after("love", LOVE_MS, () => setLove(false));
    say("♥");
    hold(LOVE_MS);
  }, [loveTick, timers, say, hold]);

  // Petting is state, not ambient motion: it shows even under reduced motion.
  useEffect(() => {
    if (petTick === lastPetTick.current) return;
    lastPetTick.current = petTick;
    startPurr();
  }, [petTick, startPurr]);

  // Click/tap (and Enter/Space): a reaction in place. It never reaches the card, so the terminal stays as it is.
  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const n = clicks.current++;
    const next = n === 0 ? { pose: "hop-react" as const, ms: HOP_REACT_MS } : REACTIONS[(n - 1) % REACTIONS.length];
    if (n === 0) say("!");
    timers.cancel("react");
    setReaction(null);
    if (next.pose === "purr") startPurr();
    else {
      setReaction(next.pose);
      timers.after("react", next.ms, () => setReaction(null));
      hold(next.ms);
    }
    onCatClick?.();
  };

  const roam = reduceMotion ? null : wander;
  const phase = roam?.phase ?? "sit";
  const lookPose: CatPose = gaze === "up" ? "look-up" : gaze === "l" ? "look-l" : "look-r";
  const catPose: CatPose =
    phase === "hop"
      ? "hop"
      : (reaction ??
        (love
          ? "love"
          : thinking
            ? "think"
            : happy
              ? "happy"
              : phase === "walk" || stepping
                ? "walk"
                : paw
                  ? "paw"
                  : purr && !shades
                    ? "purr"
                    : phase === "attend"
                      ? lookPose
                      : shades
                        ? "shades"
                        : PHASE_POSE[phase]));
  const catSprite = (shades ? CAT_SHADES : CAT)[skin][catPose];
  // every hop step crouches again: a new step restarts the hop's frames
  const catFrame = useFrame(timers, "cat-frame", catSprite, !reduceMotion, phase === "hop" ? roam?.since : null);

  const facing = ORIENTED.has(catPose) ? 1 : thinking ? -1 : (roam?.facing ?? 1);
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
          : phase === "attend" && stepping
            ? `transform ${STEP_MS - SETTLE_MS}ms linear`
            : undefined,
  };

  return (
    <div ref={wrapperRef} className="pointer-events-none absolute inset-0">
      <div className="absolute top-0 left-0" style={catBoxStyle}>
        {bubble && (
          <span
            data-bubble=""
            aria-hidden="true"
            className="absolute bottom-full left-1/2 mb-0.5 -translate-x-1/2 rounded-sm border border-line bg-surface px-1 py-0.5 font-mono text-[10px] leading-none whitespace-nowrap text-ink"
          >
            {bubble}
          </span>
        )}
        <button
          ref={buttonRef}
          type="button"
          aria-label="the cat"
          data-cat=""
          onClick={onClick}
          // A pointer press never moves focus: WebKit would hand it to the card, activating the terminal (and
          // opening the iOS keyboard); in Chromium an active terminal keeps its input focused. Keyboard focus still works.
          onPointerDown={preventDefault}
          onMouseDown={preventDefault}
          className="pointer-events-auto block cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <PixelSprite
            sprite={catSprite}
            pose={catPose}
            frame={catFrame}
            shades={shades}
            className="h-10 w-auto"
            // the sprite faces right; mirror it (instantly, outside the leg's transition) to face left
            style={catSpriteStyle}
          />
        </button>
      </div>
    </div>
  );
}
