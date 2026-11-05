import { describe, it, expect } from "vitest";
import { AHNAF_W, CAT_W, GAP, TOP_START, ahnafBox, boundsOf, catBox, overlaps, type Box, type Size } from "./layout";
import { holdWander, initialWander, stepWander, type WanderState } from "./wander";

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// desktop and phone cards as measured, plus a cramped one
const SIZES: Size[] = [
  { w: 576, h: 175 },
  { w: 358, h: 191 },
  { w: 200, h: 140 },
];

/** Every box the cat passes through on the way from one state's position to the next (CSS moves it in a straight line). */
function sweep(a: Box, b: Box, steps = 8): Box[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    return { ...a, x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  });
}

describe("layout", () => {
  it("Ahnaf stands at the left end of the title bar, and the cat's top track starts 8 px to his right", () => {
    expect(ahnafBox()).toEqual({ x: 16, y: -40, w: AHNAF_W, h: 48 });
    expect(TOP_START).toBe(16 + AHNAF_W + GAP);
    expect(catBox({ edge: "top", x: 0 }, SIZES[0]).x).toBeGreaterThanOrEqual(ahnafBox().x + ahnafBox().w + 8);
  });

  it("the top track runs to the right-hand corner, in line with the right edge's column", () => {
    const size = SIZES[0];
    const b = boundsOf(size);
    expect(catBox({ edge: "top", x: b.topWidth }, size).x).toBe(size.w - CAT_W / 2);
    expect(catBox({ edge: "right", x: 50 }, size).x).toBe(size.w - CAT_W / 2);
    expect(catBox({ edge: "bottom", x: b.bottomWidth }, size).x).toBe(size.w - CAT_W / 2);
    expect(catBox({ edge: "bottom", x: 0 }, size).x).toBe(0);
  });

  it("the cat never overlaps Ahnaf: every reachable wander state and every path between them", () => {
    const ahnaf = ahnafBox();
    for (const size of SIZES) {
      const bounds = boundsOf(size);
      for (let seed = 1; seed <= 8; seed++) {
        const rng = mulberry32(seed);
        let s: WanderState = initialWander(0, bounds, rng, 0);
        let prev = catBox(s, size);
        for (let i = 0; i < 600; i++) {
          const next = i % 97 === 50 ? holdWander(s, (s.since + s.until) / 2, 2000) : stepWander(s, s.until, bounds, rng);
          const box = catBox(next, size);
          for (const b of sweep(prev, box)) expect(overlaps(b, ahnaf), `${size.w}×${size.h} seed ${seed} step ${i} ${next.phase}@${next.edge}`).toBe(false);
          s = next;
          prev = box;
        }
      }
    }
  });
});
