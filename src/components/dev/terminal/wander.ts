/**
 * The cat's wander state machine. Pure: every step is a function of the
 * previous state, the time, the territory and an injected rng.
 *
 * Territory is the card's outer edges, each measured as a 1-D track:
 *   top    — x from the card's left (0) to its right-hand corner (topWidth)
 *   right  — x down the card's right side, from the top corner (0) to the
 *            bottom corner (rightHeight)
 *   bottom — x from the left (0) to the right-hand corner (bottomWidth)
 * Hops always go through the right edge: top → right → bottom → right → top.
 *
 * A state describes one leg: the cat travels from `from` to `x` between
 * `since` and `until` (everything but walk and hop has from === x).
 *
 * Personality: it ambles (20–30 px/s) and mostly keeps heading the same way,
 * rests more than it walks, sometimes stops mid-walk to look at the visitor,
 * and naps for 10–15 s every 30–45 s, yawning when it wakes.
 */
export type Edge = "top" | "right" | "bottom";
export type RestPhase = "sit" | "stretch" | "groom" | "tail";
export type WanderPhase = "walk" | RestPhase | "look" | "sleep" | "yawn" | "hop";

export interface WanderBounds {
  topWidth: number;
  rightHeight: number;
  bottomWidth: number;
}

export interface WanderState {
  phase: WanderPhase;
  edge: Edge;
  /** where this leg ends, along `edge` */
  x: number;
  /** where this leg starts, along `edge` (along the right edge, for a hop's first step) */
  from: number;
  facing: 1 | -1;
  since: number;
  until: number;
  /** when the next nap is due */
  sleepAt: number;
  /** only while hopping: heading for `to`, on step `step` of `steps` (the last step lands) */
  hop?: { to: "top" | "bottom"; step: number; steps: number };
}

export const WALK_MS: readonly [number, number] = [1000, 3000];
export const WALK_PX_PER_S: readonly [number, number] = [20, 30];
export const REST_MS: readonly [number, number] = [2500, 6000]; // long sits, so it rests more than it walks between naps
export const FIRST_SIT_MS: readonly [number, number] = [1000, 2000];
export const LOOK_MS = 1000;
export const YAWN_MS = 1200;
export const SLEEP_MS: readonly [number, number] = [10_000, 15_000];
/** Nap start to next nap start, before the ≤6 s it may wait for the current leg to end: 30–45 s overall. */
export const NAP_GAP_MS: readonly [number, number] = [30_000, 39_000];
export const HOP_STEP_MS = 400;
const KEEP_HEADING = 0.7; // a new walk mostly carries on the same way
const LOOK_CHANCE = 0.25; // a walk ends in a glance at the visitor, then carries on
const HOP_CHANCE = 0.5; // at the right-hand corner, hop to the other edge
const MIN_WALK_PX = 12;
const RESTS: readonly RestPhase[] = ["sit", "stretch", "groom", "tail"];

const between = (rng: () => number, [lo, hi]: readonly [number, number]) => lo + rng() * (hi - lo);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const isRest = (p: WanderPhase): p is RestPhase => (RESTS as readonly string[]).includes(p);

export function edgeLength(edge: Edge, b: WanderBounds): number {
  const len = edge === "top" ? b.topWidth : edge === "bottom" ? b.bottomWidth : b.rightHeight;
  return Math.max(0, len);
}

/** Where along its edge the cat is at `now` (linear, matching the CSS transition). */
export function wanderX(s: WanderState, now: number): number {
  const span = s.until - s.since;
  if (span <= 0 || s.phase !== "walk") return s.x;
  const t = clamp((now - s.since) / span, 0, 1);
  return s.from + (s.x - s.from) * t;
}

export function initialWander(now: number, b: WanderBounds, rng: () => number, x: number): WanderState {
  const home = clamp(x, 0, edgeLength("top", b));
  return {
    phase: "sit",
    edge: "top",
    x: home,
    from: home,
    facing: 1,
    since: now,
    until: now + between(rng, FIRST_SIT_MS), // a short first pause, then off it goes
    sleepAt: now + between(rng, NAP_GAP_MS),
  };
}

const settle = (s: WanderState, x: number, now: number, phase: WanderPhase, ms: number, facing = s.facing): WanderState => ({
  phase,
  edge: s.edge,
  x,
  from: x,
  facing,
  since: now,
  until: now + ms,
  sleepAt: s.sleepAt,
});

/** Freeze the cat where it is for `ms` (petting wakes a napper); a hop in mid-air finishes first. */
export function holdWander(s: WanderState, now: number, ms: number): WanderState {
  if (s.phase === "hop") return s;
  return settle(s, wanderX(s, now), now, "sit", ms);
}

/** The visitor started typing: a napping cat wakes with a yawn, a resting one looks toward the prompt (left). */
export function noticeWander(s: WanderState, now: number): WanderState {
  if (s.phase === "sleep") return settle(s, s.x, now, "yawn", YAWN_MS);
  if (isRest(s.phase) || s.phase === "look") return settle(s, s.x, now, "look", LOOK_MS, -1);
  return s;
}

function walk(s: WanderState, x: number, now: number, b: WanderBounds, rng: () => number): WanderState {
  const len = edgeLength(s.edge, b);
  const ms = between(rng, WALK_MS);
  const speed = between(rng, WALK_PX_PER_S);
  const want = (speed * ms) / 1000;
  let dir: 1 | -1 = rng() < KEEP_HEADING ? s.facing : s.facing === 1 ? -1 : 1;
  const room = (d: 1 | -1) => (d > 0 ? len - x : x);
  if (room(dir) < MIN_WALK_PX) dir = dir === 1 ? -1 : 1;
  const avail = room(dir);
  const clipped = avail <= want;
  const dist = clipped ? avail : want;
  const target = clipped ? (dir > 0 ? len : 0) : x + dir * dist;
  return {
    phase: "walk",
    edge: s.edge,
    from: x,
    x: target,
    facing: target === x ? s.facing : dir,
    since: now,
    // a walk cut short at the end of the edge keeps its pace (never below a second)
    until: now + (clipped ? Math.max(WALK_MS[0], (dist / speed) * 1000) : ms),
    sleepAt: s.sleepAt,
  };
}

function hopStep(s: WanderState, now: number, b: WanderBounds, hop: NonNullable<WanderState["hop"]>, from: number): WanderState {
  const landing = hop.step === hop.steps;
  const along = (b.rightHeight * hop.step) / hop.steps;
  return {
    phase: "hop",
    edge: landing ? hop.to : "right",
    from,
    x: landing ? edgeLength(hop.to, b) : Math.max(0, hop.to === "bottom" ? along : b.rightHeight - along),
    facing: s.facing,
    since: now,
    until: now + HOP_STEP_MS,
    sleepAt: s.sleepAt,
    hop,
  };
}

export function stepWander(s: WanderState, now: number, b: WanderBounds, rng: () => number): WanderState {
  const x = clamp(s.x, 0, edgeLength(s.edge, b));

  // Mid-hop: keep hopping until it lands.
  if (s.phase === "hop" && s.hop && s.hop.step < s.hop.steps) {
    return hopStep(s, now, b, { ...s.hop, step: s.hop.step + 1 }, x);
  }

  // A nap ends in a yawn.
  if (s.phase === "sleep") return settle(s, x, now, "yawn", YAWN_MS);

  // Nap when due, at the end of any leg (never on the right edge: hops land first).
  if (s.edge !== "right" && now >= s.sleepAt) {
    return { ...settle(s, x, now, "sleep", between(rng, SLEEP_MS)), sleepAt: now + between(rng, NAP_GAP_MS) };
  }

  if (s.phase === "walk") {
    const len = edgeLength(s.edge, b);
    if (s.edge !== "right" && len > 0 && x === len && rng() < HOP_CHANCE) {
      const steps = rng() < 0.5 ? 2 : 3;
      return hopStep(s, now, b, { to: s.edge === "top" ? "bottom" : "top", step: 1, steps }, s.edge === "top" ? 0 : b.rightHeight);
    }
    if (rng() < LOOK_CHANCE) return settle(s, x, now, "look", LOOK_MS);
    const rest = RESTS[Math.min(RESTS.length - 1, Math.floor(rng() * RESTS.length))];
    return settle(s, x, now, rest, between(rng, REST_MS));
  }

  // After a rest, a look, a yawn or a landing: walk on.
  return walk(s, x, now, b, rng);
}
