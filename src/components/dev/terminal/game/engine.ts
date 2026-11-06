import { OBSTACLE_SIZE } from "./gameSprites";

/* Cat Dash: a pure, DOM-free one-button runner. y grows downward; the cat's
 * feet rest at WORLD.ground and a jump makes catY smaller. */

export const WORLD = { w: 240, h: 135, ground: 110, catX: 32 } as const;
export const SPEED = { start: 90, perHundred: 4, max: 200 } as const;
export const GAP = { min: 70, max: 140 } as const;
export const JUMP = { apex: 36, durationMs: 560 } as const;
/** The cat's hitbox (the visible body of the 24×24 grid), feet at catY. */
export const CAT_BOX = { w: 24, h: 20 } as const;
/** Longest step the engine will simulate; longer gaps (tab switch) are clamped. */
export const MAX_DT = 0.05;
export const SHAKE = 0.12;

export type ObstacleKind = "box" | "cucumber";
export interface Obstacle {
  kind: ObstacleKind;
  x: number;
  w: number;
  h: number;
}
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface GameState {
  t: number;
  distance: number;
  score: number;
  best: number;
  speed: number;
  catY: number;
  catVy: number;
  airborne: boolean;
  obstacles: Obstacle[];
  nextGap: number;
  over: boolean;
  shake: number;
  lastKind: ObstacleKind | null;
}
/** Returns a number in [0, 1). */
export type Rng = () => number;

const T = JUMP.durationMs / 1000;
const V0 = (4 * JUMP.apex) / T;
const G = (8 * JUMP.apex) / (T * T);

const rollGap = (rng: Rng) => GAP.min + rng() * (GAP.max - GAP.min);
const speedFor = (score: number) => Math.min(SPEED.max, SPEED.start + SPEED.perHundred * Math.floor(score / 100));

export function createGame(best: number, rng: Rng): GameState {
  return {
    t: 0,
    distance: 0,
    score: 0,
    best,
    speed: SPEED.start,
    catY: WORLD.ground,
    catVy: 0,
    airborne: false,
    obstacles: [],
    nextGap: rollGap(rng),
    over: false,
    shake: 0,
    lastKind: null,
  };
}

export function jump(s: GameState): GameState {
  if (s.airborne || s.over) return s;
  return { ...s, catVy: -V0, airborne: true };
}

/** Axis-aligned overlap with both boxes shrunk by `margin` on every side. */
export function collide(a: Box, b: Box, margin = 2): boolean {
  return (
    a.x + margin < b.x + b.w - margin &&
    b.x + margin < a.x + a.w - margin &&
    a.y + margin < b.y + b.h - margin &&
    b.y + margin < a.y + a.h - margin
  );
}

export function step(s: GameState, dt: number, rng: Rng): GameState {
  const d = Math.min(Math.max(dt, 0), MAX_DT);
  if (s.over) return { ...s, t: s.t + d, shake: Math.max(0, s.shake - d) };

  // Cat: exact constant-gravity integration, so the apex is JUMP.apex at any dt; landing snaps to the ground.
  let catVy = s.catVy;
  let catY = s.catY;
  let airborne = s.airborne;
  if (airborne) {
    catY += catVy * d + 0.5 * G * d * d;
    catVy += G * d;
    if (catY >= WORLD.ground) {
      catY = WORLD.ground;
      catVy = 0;
      airborne = false;
    }
  }

  const dx = s.speed * d;
  const distance = s.distance + dx;
  const score = Math.floor(distance / 10);
  const speed = speedFor(score);

  const obstacles = s.obstacles.map((o) => ({ ...o, x: o.x - dx })).filter((o) => o.x + o.w >= 0);
  let { nextGap, lastKind } = s;
  const last = obstacles[obstacles.length - 1];
  if (!last || last.x + last.w < WORLD.w - nextGap) {
    let kind: ObstacleKind = rng() < 0.5 ? "box" : "cucumber";
    if (kind === "cucumber" && lastKind === "cucumber") kind = "box";
    obstacles.push({ kind, x: WORLD.w, ...OBSTACLE_SIZE[kind] });
    lastKind = kind;
    nextGap = rollGap(rng);
  }

  const cat: Box = { x: WORLD.catX, y: catY - CAT_BOX.h, w: CAT_BOX.w, h: CAT_BOX.h };
  const hit = obstacles.some((o) => collide(cat, { x: o.x, y: WORLD.ground - o.h, w: o.w, h: o.h }));

  return {
    ...s,
    t: s.t + d,
    distance,
    score,
    speed,
    catY,
    catVy,
    airborne,
    obstacles,
    nextGap,
    lastKind,
    over: hit,
    shake: hit ? SHAKE : 0,
    best: hit ? Math.max(s.best, score) : s.best,
  };
}
