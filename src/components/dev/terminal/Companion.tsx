import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { SkinName } from "./commands";
import type { Mood } from "./useTerminal";
import { AHNAF, CAT, PALETTE, toRects, type AhnafPose, type CatPose, type Sprite } from "./sprites";

const BLINK_EVERY_MS = 4000;
const BLINK_MS = 150;
const STRETCH_MS = 800;
const WALK_EVERY_MS = 30_000;
const WALK_MS = 3000; // out and back: two 1500 ms legs
const WALK_FRAME_MS = 150;
const PURR_MS = 2000;
const WALK_INSET_PX = 16; // how close to the card's left edge the cat walks

/** One keyed scheduler for every timer the companions use; re-arming a key replaces it. */
function createTimers() {
  const ids = new Map<string, { id: ReturnType<typeof setTimeout>; repeat: boolean }>();
  const cancel = (key: string) => {
    const t = ids.get(key);
    if (!t) return;
    if (t.repeat) clearInterval(t.id);
    else clearTimeout(t.id);
    ids.delete(key);
  };
  return {
    after(key: string, ms: number, fn: () => void) {
      cancel(key);
      const id = setTimeout(() => {
        ids.delete(key);
        fn();
      }, ms);
      ids.set(key, { id, repeat: false });
    },
    every(key: string, ms: number, fn: () => void) {
      cancel(key);
      ids.set(key, { id: setInterval(fn, ms), repeat: true });
    },
    cancel,
    clear() {
      for (const key of [...ids.keys()]) cancel(key);
    },
  };
}

interface Walk {
  step: number; // frame counter: even → walk1, odd → walk2
  back: boolean; // second leg: heading home
  dx: number; // px to travel left
}

function walkDistance(wrapper: HTMLElement | null, cat: HTMLElement | null): number {
  if (!wrapper || !cat) return 0;
  return Math.max(0, wrapper.offsetLeft + cat.offsetLeft - WALK_INSET_PX);
}

function PixelSprite(props: {
  who: "ahnaf" | "cat";
  sprite: Sprite;
  pose: string;
  className: string;
  style?: CSSProperties;
}) {
  const { who, sprite, pose, className, style } = props;
  const rects = useMemo(() => toRects(sprite.frames[0], PALETTE), [sprite]);
  return (
    <svg
      data-sprite={who}
      data-pose={pose}
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
  const [stretch, setStretch] = useState(false);
  const [walk, setWalk] = useState<Walk | null>(null);
  const [purr, setPurr] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const catRef = useRef<HTMLDivElement>(null);
  const wasActive = useRef(false);
  const lastPetTick = useRef(petTick);

  useEffect(() => () => timers.clear(), [timers]);

  // Ambient motion only while active; going inactive clears every timer.
  useEffect(() => {
    const rising = active && !wasActive.current;
    wasActive.current = active;
    if (!active) return;
    if (!reduceMotion) {
      if (rising) {
        setStretch(true);
        timers.after("stretch", STRETCH_MS, () => setStretch(false));
      }
      timers.every("blink", BLINK_EVERY_MS, () => {
        setBlink(true);
        timers.after("blink-end", BLINK_MS, () => setBlink(false));
      });
      timers.every("walk", WALK_EVERY_MS, () => {
        setWalk({ step: 0, back: false, dx: walkDistance(wrapperRef.current, catRef.current) });
        timers.every("walk-step", WALK_FRAME_MS, () => setWalk((w) => w && { ...w, step: w.step + 1 }));
        timers.after("walk-back", WALK_MS / 2, () => setWalk((w) => w && { ...w, back: true }));
        timers.after("walk-end", WALK_MS, () => {
          timers.cancel("walk-step");
          setWalk(null);
        });
      });
    }
    return () => {
      timers.clear();
      setBlink(false);
      setStretch(false);
      setWalk(null);
      setPurr(false);
    };
  }, [active, reduceMotion, timers]);

  // Petting is state, not ambient motion: it shows even under reduced motion.
  useEffect(() => {
    if (petTick === lastPetTick.current) return;
    lastPetTick.current = petTick;
    setPurr(true);
    timers.after("purr", PURR_MS, () => setPurr(false));
  }, [petTick, timers]);

  const ahnafPose: AhnafPose = shades ? "shades" : mood === "idle" ? (blink ? "blink" : "idle") : mood;
  const catPose: CatPose = shades
    ? "shades"
    : purr
      ? "purr"
      : walk
        ? walk.step % 2
          ? "walk2"
          : "walk1"
        : stretch
          ? "stretch"
          : active
            ? "awake"
            : "sleep";

  const catBoxStyle: CSSProperties = {
    transform: `translateX(${walk && !walk.back ? -walk.dx : 0}px)`,
    transition: reduceMotion ? undefined : "transform 1500ms linear",
  };

  return (
    <div ref={wrapperRef} className="pointer-events-none absolute -top-5 right-6 flex items-end gap-1">
      <PixelSprite who="ahnaf" sprite={AHNAF[skin][ahnafPose]} pose={ahnafPose} className="h-6 w-auto" />
      <div ref={catRef} style={catBoxStyle}>
        <PixelSprite
          who="cat"
          sprite={CAT[skin][catPose]}
          pose={catPose}
          className="h-4 w-auto"
          // face the way it walks: the sprite faces left, so mirror it on the way back
          style={walk?.back ? { transform: "scaleX(-1)" } : undefined}
        />
      </div>
    </div>
  );
}
