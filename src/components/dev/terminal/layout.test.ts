import { describe, it, expect } from "vitest";
import { CAT_H, CAT_W, TOP_START, boundsOf, catBox, menuPlacement, type Size } from "./layout";
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

describe("layout", () => {
  it("the cat's top track spans the whole title bar, from the card's 16 px padding", () => {
    expect(TOP_START).toBe(16);
    const size = SIZES[0];
    expect(catBox({ edge: "top", x: 0 }, size)).toEqual({ x: 16, y: -CAT_H, w: CAT_W, h: CAT_H });
    expect(boundsOf(size).topWidth).toBe(size.w - CAT_W / 2 - 16);
  });

  it("the top track runs to the right-hand corner, in line with the right edge's column", () => {
    const size = SIZES[0];
    const b = boundsOf(size);
    expect(catBox({ edge: "top", x: b.topWidth }, size).x).toBe(size.w - CAT_W / 2);
    expect(catBox({ edge: "right", x: 50 }, size).x).toBe(size.w - CAT_W / 2);
    expect(catBox({ edge: "bottom", x: b.bottomWidth }, size).x).toBe(size.w - CAT_W / 2);
    expect(catBox({ edge: "bottom", x: 0 }, size).x).toBe(0);
  });

  it("the cat keeps to the card's outer edges: every reachable state is above, beside or below the card body", () => {
    for (const size of SIZES) {
      const bounds = boundsOf(size);
      for (let seed = 1; seed <= 8; seed++) {
        const rng = mulberry32(seed);
        let s: WanderState = initialWander(0, bounds, rng, 0);
        for (let i = 0; i < 600; i++) {
          s = i % 97 === 50 ? holdWander(s, (s.since + s.until) / 2, 2000) : stepWander(s, s.until, bounds, rng);
          const box = catBox(s, size);
          const where = `${size.w}×${size.h} seed ${seed} step ${i} ${s.phase}@${s.edge}`;
          expect(box.x, where).toBeGreaterThanOrEqual(0);
          expect(box.x + box.w / 2, where).toBeLessThanOrEqual(size.w);
          if (s.edge === "top") expect(box.y + box.h, where).toBe(0);
          if (s.edge === "bottom") expect(box.y, where).toBe(size.h - 8);
        }
      }
    }
  });
});

describe("menuPlacement", () => {
  const size: Size = { w: 576, h: 175 };
  it("centres the menu over the cat, but keeps it on the card near the left and right ends", () => {
    expect(menuPlacement({ x: 16, y: 100 }, size).align).toBe("left");
    expect(menuPlacement({ x: 49, y: 100 }, size).align).toBe("left");
    expect(menuPlacement({ x: 50, y: 100 }, size).align).toBe("center");
    expect(menuPlacement({ x: 526, y: 100 }, size).align).toBe("center");
    expect(menuPlacement({ x: 527, y: 100 }, size).align).toBe("right");
  });
  it("opens below a cat on the top track (above the card's top) and above it elsewhere", () => {
    expect(menuPlacement(catBox({ edge: "top", x: 100 }, size), size).side).toBe("bottom");
    expect(menuPlacement(catBox({ edge: "right", x: 0 }, size), size).side).toBe("bottom");
    expect(menuPlacement(catBox({ edge: "right", x: 100 }, size), size)).toEqual({ align: "right", side: "top" });
    expect(menuPlacement(catBox({ edge: "bottom", x: 200 }, size), size)).toEqual({ align: "center", side: "top" });
  });
});
