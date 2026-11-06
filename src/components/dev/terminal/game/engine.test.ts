// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  CAT_BOX,
  GAP,
  JUMP,
  SPEED,
  WORLD,
  collide,
  createGame,
  jump,
  step,
  type GameState,
  type Obstacle,
  type Rng,
} from "./engine";
import { BOX, CUCUMBER, GROUND_DASH, OBSTACLE_SIZE } from "./gameSprites";

const FRAME = 1 / 60;
const half: Rng = () => 0.5;

/** Mulberry32: a small deterministic rng for the long-run tests. */
function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A state with no obstacles that won't spawn any for a while (huge gap). */
function quiet(over: Partial<GameState> = {}): GameState {
  return { ...createGame(0, half), obstacles: [], nextGap: 10_000, lastKind: "box", ...over };
}

describe("createGame", () => {
  it("starts on the ground at start speed with the given best", () => {
    const s = createGame(42, half);
    expect(s).toMatchObject({ t: 0, distance: 0, score: 0, best: 42, speed: SPEED.start, catY: WORLD.ground, catVy: 0, airborne: false, over: false, shake: 0 });
    expect(s.nextGap).toBeGreaterThanOrEqual(GAP.min);
    expect(s.nextGap).toBeLessThanOrEqual(GAP.max);
  });
});

describe("jump and gravity", () => {
  it("returns the cat to the ground within ~0.56 s and never below it", () => {
    let s = jump(quiet());
    expect(s.airborne).toBe(true);
    let minY = s.catY;
    let landedAt = -1;
    for (let i = 1; i <= 60; i++) {
      s = step(s, FRAME, half);
      expect(s.catY).toBeLessThanOrEqual(WORLD.ground);
      minY = Math.min(minY, s.catY);
      if (landedAt < 0 && !s.airborne) landedAt = i * FRAME;
    }
    expect(landedAt).toBeGreaterThan(JUMP.durationMs / 1000 - 0.03);
    expect(landedAt).toBeLessThan(JUMP.durationMs / 1000 + 0.03);
    expect(s.catY).toBe(WORLD.ground);
    expect(s.catVy).toBe(0);
    expect(WORLD.ground - minY).toBeGreaterThan(JUMP.apex - 1);
    expect(WORLD.ground - minY).toBeLessThanOrEqual(JUMP.apex + 0.001);
  });

  it("ignores jump while airborne", () => {
    const s = step(jump(quiet()), FRAME, half);
    expect(jump(s)).toBe(s);
  });

  it("ignores jump when over", () => {
    const s = quiet({ over: true });
    expect(jump(s)).toBe(s);
  });
});

describe("collide", () => {
  const a = { x: 0, y: 0, w: 10, h: 10 };
  it("is true for an overlap beyond the margin", () => {
    expect(collide(a, { x: 5, y: 0, w: 10, h: 10 })).toBe(true);
    expect(collide(a, { x: 0, y: 5, w: 10, h: 10 })).toBe(true);
  });
  it("is false for a 1 px overlap at the margin", () => {
    expect(collide(a, { x: 9, y: 0, w: 10, h: 10 })).toBe(false);
    expect(collide(a, { x: 0, y: 9, w: 10, h: 10 })).toBe(false);
  });
  it("is false when apart and respects an explicit margin", () => {
    expect(collide(a, { x: 20, y: 0, w: 10, h: 10 })).toBe(false);
    expect(collide(a, { x: 9, y: 0, w: 10, h: 10 }, 0)).toBe(true);
  });
});

describe("spawning", () => {
  for (const [label, rng] of [["() => 0", () => 0], ["() => 0.999", () => 0.999]] as [string, Rng][]) {
    it(`spawns at WORLD.w with gaps within GAP (rng ${label})`, () => {
      let s = createGame(0, rng);
      let spawns = 0;
      for (let i = 0; i < 60 * 30 && spawns < 12; i++) {
        s = jump(s); // keep hopping so a collision doesn't end the run early
        const before = s.obstacles.length ? s.obstacles[s.obstacles.length - 1] : null;
        const v = s.speed;
        s = step(s, FRAME, rng);
        expect(s.nextGap).toBeGreaterThanOrEqual(GAP.min);
        expect(s.nextGap).toBeLessThanOrEqual(GAP.max);
        const last = s.obstacles[s.obstacles.length - 1];
        if (last && last.x === WORLD.w) {
          spawns++;
          expect(last.x).toBe(WORLD.w);
          expect({ w: last.w, h: last.h }).toEqual(OBSTACLE_SIZE[last.kind]);
          if (before) {
            const moved = before.x - v * FRAME;
            const gap = last.x - (moved + before.w);
            expect(gap).toBeGreaterThanOrEqual(GAP.min);
            expect(gap).toBeLessThanOrEqual(GAP.max + v * FRAME);
          }
        }
        if (s.over) s = { ...s, over: false };
      }
      expect(spawns).toBeGreaterThanOrEqual(5);
    });
  }

  it("never spawns two cucumbers in a row over 50 spawns", () => {
    for (const rng of [() => 0.999, () => 0, seeded(1), seeded(7)] as Rng[]) {
      let s: GameState = { ...createGame(0, rng), speed: SPEED.max };
      const kinds: string[] = [];
      for (let i = 0; kinds.length < 50 && i < 100_000; i++) {
        s = step({ ...s, over: false }, 0.05, rng);
        // a fresh spawn is the only obstacle sitting exactly at the right edge
        for (const o of s.obstacles) if (o.x === WORLD.w) kinds.push(o.kind);
      }
      expect(kinds.length).toBeGreaterThanOrEqual(50);
      for (let i = 1; i < kinds.length; i++) expect(kinds[i - 1] === "cucumber" && kinds[i] === "cucumber").toBe(false);
    }
  });
});

describe("speed and score", () => {
  it("speed is 90 at score 0, 94 at 100, capped at 200", () => {
    expect(step(quiet(), FRAME, half).speed).toBe(90);
    expect(step(quiet({ distance: 1000 }), FRAME, half).speed).toBe(94);
    expect(step(quiet({ distance: 1_000_000 }), FRAME, half).speed).toBe(SPEED.max);
  });

  it("score = floor(distance / 10)", () => {
    let s = quiet();
    for (let i = 0; i < 90; i++) {
      s = step(s, FRAME, half);
      expect(s.score).toBe(Math.floor(s.distance / 10));
    }
    expect(s.distance).toBeCloseTo(90 * 1.5, 6);
    expect(s.score).toBe(13);
  });
});

describe("obstacles", () => {
  it("removes obstacles once x + w < 0", () => {
    const gone: Obstacle = { kind: "box", x: -14, w: 14, h: 12 };
    const s = step(quiet({ obstacles: [gone] }), FRAME, half);
    expect(s.obstacles.some((o) => o.x + o.w < 0)).toBe(false);
    expect(s.obstacles.every((o) => o.x === WORLD.w)).toBe(true); // only a fresh spawn remains
    const edge: Obstacle = { kind: "box", x: 1, w: 14, h: 12 };
    const kept = step(quiet({ obstacles: [edge], catY: WORLD.ground - 60, airborne: true }), FRAME, half);
    expect(kept.obstacles).toHaveLength(1);
  });

  it("collision sets over, shake = 0.12 and best = max(best, score)", () => {
    const hit: Obstacle = { kind: "box", x: WORLD.catX + 4, w: 14, h: 12 };
    const s = step(quiet({ obstacles: [hit], distance: 500, best: 10 }), FRAME, half);
    expect(s.over).toBe(true);
    expect(s.shake).toBe(0.12);
    expect(s.best).toBe(50);
    const low = step(quiet({ obstacles: [hit], distance: 500, best: 900 }), FRAME, half);
    expect(low.best).toBe(900);
  });

  it("does nothing more once over except decaying shake", () => {
    const s = quiet({ over: true, shake: 0.12, distance: 300 });
    const n = step(s, FRAME, half);
    expect(n.distance).toBe(300);
    expect(n.shake).toBeCloseTo(0.12 - FRAME, 9);
  });

  it("the cat box sits on the ground at catX", () => {
    expect(CAT_BOX.w).toBeGreaterThan(0);
    expect(CAT_BOX.h).toBeGreaterThan(0);
  });
});

describe("dt clamp", () => {
  it("a 5 s gap advances at most one frame's worth", () => {
    const rng = seeded(3);
    let s = jump(createGame(0, half));
    for (let i = 0; i < 30; i++) s = step(s, FRAME, half);
    expect(step(s, 5, half)).toEqual(step(s, 0.05, half));
    const big = step(s, 5, rng);
    expect(big.catY).toBeLessThanOrEqual(WORLD.ground);
    expect(big.distance - s.distance).toBeCloseTo(s.speed * 0.05, 6);
  });
});

describe("sprites", () => {
  const grids: [string, string[], RegExp][] = [
    ["BOX", BOX, /^[.fs]+$/],
    ["CUCUMBER", CUCUMBER, /^[.as]+$/],
    ["GROUND_DASH", GROUND_DASH, /^[.f]+$/],
  ];
  for (const [name, g, chars] of grids) {
    it(`${name} is a rectangular grid of its palette chars`, () => {
      expect(g.length).toBeGreaterThan(0);
      for (const row of g) {
        expect(row.length).toBe(g[0].length);
        expect(row).toMatch(chars);
      }
    });
  }
  it("OBSTACLE_SIZE matches the grids (box 14×12, cucumber 18×8)", () => {
    expect(OBSTACLE_SIZE).toEqual({ box: { w: 14, h: 12 }, cucumber: { w: 18, h: 8 } });
    expect([BOX[0].length, BOX.length]).toEqual([14, 12]);
    expect([CUCUMBER[0].length, CUCUMBER.length]).toEqual([18, 8]);
  });
});
