import { describe, it, expect } from "vitest";
import {
  HOP_STEP_MS,
  REST_MS,
  LOOK_MS,
  YAWN_MS,
  edgeLength,
  holdWander,
  initialWander,
  attendWander,
  stepTowardWander,
  stepWander,
  wanderX,
  type WanderBounds,
  type WanderState,
} from "./wander";

/** Small seeded PRNG so every run walks the same path. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BOUNDS: WanderBounds = { topWidth: 544, rightHeight: 207, bottomWidth: 544 };

function simulate(ms: number, seed = 1, bounds = BOUNDS): WanderState[] {
  const rng = mulberry32(seed);
  let s = initialWander(0, bounds, rng, 400);
  const out = [s];
  while (s.until < ms) {
    s = stepWander(s, s.until, bounds, rng);
    out.push(s);
  }
  return out;
}

const dur = (s: WanderState) => s.until - s.since;
const SEEDS = Array.from({ length: 20 }, (_, i) => i + 1);

describe("stepWander", () => {
  it("is pure and deterministic for a given rng", () => {
    const a = simulate(120_000, 7);
    const b = simulate(120_000, 7);
    expect(a).toEqual(b);
    const s = Object.freeze({ ...a[3] });
    const copy = { ...s };
    stepWander(s, s.until, BOUNDS, mulberry32(3));
    expect(s).toEqual(copy);
  });

  it("never leaves the bounds of its edge", () => {
    for (const seed of SEEDS) {
      for (const s of simulate(600_000, seed)) {
        const len = edgeLength(s.edge, BOUNDS);
        expect(s.x).toBeGreaterThanOrEqual(0);
        expect(s.x).toBeLessThanOrEqual(len);
        expect(s.from).toBeGreaterThanOrEqual(0);
        expect(s.from).toBeLessThanOrEqual(len);
      }
    }
  });

  it("clamps into smaller bounds after a resize", () => {
    const rng = mulberry32(2);
    const s: WanderState = { ...initialWander(0, BOUNDS, rng, 500), phase: "sit" };
    const small = { topWidth: 100, rightHeight: 80, bottomWidth: 100 };
    const next = stepWander(s, s.until, small, rng);
    expect(next.from).toBeLessThanOrEqual(100);
    expect(next.x).toBeLessThanOrEqual(100);
  });

  it("stays put with zero-size bounds", () => {
    const zero = { topWidth: 0, rightHeight: 0, bottomWidth: 0 };
    for (const s of simulate(120_000, 4, zero)) {
      expect(s.x).toBe(0);
      expect(s.edge).toBe("top");
    }
  });

  it("walks for 1000–3000 ms, rests 2500–6000 ms, looks 1 s, naps 10–15 s and yawns 1.2 s", () => {
    const rests = new Set<string>();
    for (const seed of SEEDS) {
      for (const s of simulate(300_000, seed).slice(1)) {
        if (s.phase === "walk") {
          expect(dur(s)).toBeGreaterThanOrEqual(1000);
          expect(dur(s)).toBeLessThanOrEqual(3000);
        } else if (s.phase === "sleep") {
          expect(dur(s)).toBeGreaterThanOrEqual(10_000);
          expect(dur(s)).toBeLessThanOrEqual(15_000);
        } else if (s.phase === "hop") {
          expect(dur(s)).toBeCloseTo(HOP_STEP_MS, 6);
        } else if (s.phase === "look") {
          expect(dur(s)).toBeCloseTo(LOOK_MS, 6);
        } else if (s.phase === "yawn") {
          expect(dur(s)).toBeCloseTo(YAWN_MS, 6);
        } else {
          rests.add(s.phase);
          expect(dur(s)).toBeGreaterThanOrEqual(REST_MS[0]);
          expect(dur(s)).toBeLessThanOrEqual(REST_MS[1]);
        }
      }
    }
    expect([...rests].sort()).toEqual(["groom", "sit", "stretch", "tail"]);
  });

  it("ambles at 20–30 px/s", () => {
    const speeds: number[] = [];
    for (const seed of SEEDS) {
      for (const s of simulate(300_000, seed)) {
        if (s.phase !== "walk") continue;
        const px = Math.abs(s.x - s.from);
        const v = (px / dur(s)) * 1000;
        expect(v).toBeLessThanOrEqual(30 + 1e-9);
        if (px >= 20) expect(v).toBeGreaterThanOrEqual(20 - 1e-9); // only a short last step to a corner dawdles
        speeds.push(v);
      }
    }
    const mean = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    expect(mean).toBeGreaterThan(20);
    expect(mean).toBeLessThan(30);
  });

  it("rests more than it moves: at most 45% moving between naps, 20–40% overall", () => {
    for (const seed of SEEDS) {
      let moving = 0;
      let awake = 0;
      let total = 0;
      for (const s of simulate(600_000, seed).slice(1)) {
        total += dur(s);
        if (s.phase !== "sleep" && s.phase !== "yawn") awake += dur(s);
        if (s.phase === "walk" || s.phase === "hop") moving += dur(s);
      }
      expect(moving / awake, `seed ${seed} awake`).toBeGreaterThan(0.3);
      expect(moving / awake, `seed ${seed} awake`).toBeLessThanOrEqual(0.45);
      expect(moving / total, `seed ${seed} overall`).toBeGreaterThan(0.2);
      expect(moving / total, `seed ${seed} overall`).toBeLessThan(0.4);
    }
  });

  it("sometimes stops mid-walk to look at the visitor, then walks on", () => {
    const states = simulate(300_000, 3);
    const looks = states.flatMap((s, i) => (s.phase === "look" ? [i] : []));
    expect(looks.length).toBeGreaterThan(5);
    for (const i of looks) {
      expect(states[i - 1].phase).toBe("walk");
      if (states[i + 1]) expect(["walk", "sleep"]).toContain(states[i + 1].phase);
    }
  });

  it("never rests twice in a row", () => {
    const isRest = (p: WanderState) => ["sit", "stretch", "groom", "tail"].includes(p.phase);
    const states = simulate(300_000, 5);
    for (let i = 1; i < states.length; i++) expect(isRest(states[i - 1]) && isRest(states[i])).toBe(false);
  });

  it("naps for 10–15 s within the first 45 s, then every 30–45 s, waking with a yawn", () => {
    for (const seed of SEEDS) {
      const states = simulate(400_000, seed);
      const sleeps = states.filter((s) => s.phase === "sleep");
      expect(sleeps.length, `seed ${seed}`).toBeGreaterThan(7);
      expect(sleeps[0].since, `seed ${seed}`).toBeLessThanOrEqual(45_000);
      expect(sleeps[0].since, `seed ${seed}`).toBeGreaterThanOrEqual(30_000);
      for (let i = 1; i < sleeps.length; i++) {
        const gap = sleeps[i].since - sleeps[i - 1].since;
        expect(gap).toBeGreaterThanOrEqual(30_000);
        expect(gap).toBeLessThanOrEqual(45_000);
      }
      states.forEach((s, i) => {
        if (s.phase === "sleep" && states[i + 1]) expect(states[i + 1].phase).toBe("yawn");
        if (s.phase === "sleep") expect(s.edge).not.toBe("right");
      });
    }
  });

  it("hops top → right → bottom → right → top in 2–3 steps per crossing", () => {
    const allowed = new Set(["top>right", "right>bottom", "bottom>right", "right>top"]);
    let sawCycle = false;
    for (const seed of SEEDS) {
      const states = simulate(600_000, seed);
      const edges: string[] = [];
      for (const s of states) if (edges[edges.length - 1] !== s.edge) edges.push(s.edge);
      for (let i = 1; i < edges.length; i++) expect(allowed.has(`${edges[i - 1]}>${edges[i]}`), edges.join(" ")).toBe(true);
      // a crossing never turns back: top>right is always followed by bottom, and vice versa
      for (let i = 1; i < edges.length - 1; i++) if (edges[i] === "right") expect(edges[i + 1]).not.toBe(edges[i - 1]);
      if (edges.join(" ").includes("top right bottom right top")) sawCycle = true;

      // every hop run: steps on the right edge, then one landing step on the far edge
      for (let i = 0; i < states.length; i++) {
        if (states[i].phase !== "hop" || (i > 0 && states[i - 1].phase === "hop")) continue;
        const from = states[i - 1];
        expect(from.phase).toBe("walk");
        expect(from.x).toBe(edgeLength(from.edge, BOUNDS)); // hops start from the right-hand corner
        let n = 0;
        while (states[i + n]?.phase === "hop") n++;
        if (i + n >= states.length) continue; // the simulation stopped mid-hop
        expect(n === 2 || n === 3, `steps ${n}`).toBe(true);
        const landing = states[i + n - 1];
        expect(landing.edge).toBe(from.edge === "top" ? "bottom" : "top");
        expect(landing.x).toBe(edgeLength(landing.edge, BOUNDS));
        for (let k = 0; k < n - 1; k++) expect(states[i + k].edge).toBe("right");
        // down the right edge when leaving the top, back up when leaving the bottom
        const ys = states.slice(i, i + n - 1).map((s) => s.x);
        const sorted = [...ys].sort((a, b) => (from.edge === "top" ? a - b : b - a));
        expect(ys).toEqual(sorted);
      }
    }
    expect(sawCycle).toBe(true);
  });

  it("faces the way it walks, flipping with direction", () => {
    let flips = 0;
    let last: 1 | -1 | null = null;
    for (const s of simulate(300_000, 9)) {
      if (s.phase !== "walk" || s.x === s.from) continue;
      expect(s.facing).toBe(s.x > s.from ? 1 : -1);
      if (last !== null && last !== s.facing) flips++;
      last = s.facing;
    }
    expect(flips).toBeGreaterThan(3);
  });

  it("walks a random distance", () => {
    const dists = new Set(simulate(300_000, 11).filter((s) => s.phase === "walk").map((s) => Math.abs(s.x - s.from)));
    expect(dists.size).toBeGreaterThan(10);
  });
});

describe("wanderX / holdWander", () => {
  const walk: WanderState = { phase: "walk", edge: "top", from: 100, x: 300, facing: 1, since: 1000, until: 3000, sleepAt: 50_000 };

  it("interpolates a walk leg linearly", () => {
    expect(wanderX(walk, 1000)).toBe(100);
    expect(wanderX(walk, 2000)).toBe(200);
    expect(wanderX(walk, 9000)).toBe(300);
  });

  it("holds the cat where it is for the given time", () => {
    const held = holdWander(walk, 2000, 2000);
    expect(held).toMatchObject({ phase: "sit", edge: "top", x: 200, from: 200, since: 2000, until: 4000, sleepAt: 50_000 });
  });

  it("does not interrupt a hop", () => {
    const hop: WanderState = { ...walk, phase: "hop", edge: "right", hop: { to: "bottom", step: 1, steps: 2 } };
    expect(holdWander(hop, 2000, 2000)).toBe(hop);
    expect(attendWander(hop, 2000, -1)).toBe(hop);
  });
});

describe("attend", () => {
  const walk: WanderState = { phase: "walk", edge: "top", from: 100, x: 300, facing: 1, since: 1000, until: 3000, sleepAt: 50_000 };

  it("stops the cat where it is, facing the given way, until told otherwise", () => {
    const a = attendWander(walk, 2000, -1);
    expect(a).toMatchObject({ phase: "attend", edge: "top", x: 200, from: 200, facing: -1, since: 2000, until: Infinity, sleepAt: 50_000 });
    expect(wanderX(a, 1_000_000)).toBe(200);
    // re-attending only turns it; it stays put
    expect(attendWander(a, 5000, 1)).toMatchObject({ phase: "attend", x: 200, facing: 1, since: 2000 });
    expect(attendWander(a, 5000, -1)).toBe(a);
  });

  it("wakes a napper", () => {
    const nap: WanderState = { ...walk, phase: "sleep", from: 300, x: 300, until: 20_000 };
    expect(attendWander(nap, 4000, 1)).toMatchObject({ phase: "attend", x: 300 });
  });

  it("steps toward the cursor at most 8 px per step, along its edge and within bounds", () => {
    const a = attendWander(walk, 2000, 1);
    const s1 = stepTowardWander(a, 3000, 1, BOUNDS);
    expect(s1).toMatchObject({ phase: "attend", from: 200, x: 208, facing: 1, until: Infinity });
    const s2 = stepTowardWander(s1, 3300, -1, BOUNDS);
    expect(s2).toMatchObject({ from: 208, x: 200, facing: -1 });
    const atEnd = attendWander({ ...walk, phase: "sit", from: 544, x: 544 }, 0, 1);
    expect(stepTowardWander(atEnd, 10, 1, BOUNDS).x).toBe(544);
  });

  it("leaving attend walks on (or naps when due)", () => {
    const a = attendWander(walk, 2000, -1);
    const next = stepWander(a, 4000, BOUNDS, mulberry32(3));
    expect(["walk", "sleep"]).toContain(next.phase);
    expect(next.since).toBe(4000);
    expect(Number.isFinite(next.until)).toBe(true);
    const late = stepWander({ ...a, sleepAt: 0 }, 4000, BOUNDS, mulberry32(3));
    expect(late.phase).toBe("sleep");
    const early = stepWander({ ...a, sleepAt: 1e9 }, 4000, BOUNDS, mulberry32(3));
    expect(early.phase).toBe("walk");
  });
});
