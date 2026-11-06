import { describe, expect, it, vi } from "vitest";
import { CAT } from "../sprites";
import { WORLD, createGame, type GameState } from "./engine";
import { DIGITS, OBSTACLE_SIZE, STARS } from "./gameSprites";
import { render, resolvePalette, type Colours } from "./draw";

type Rect = { x: number; y: number; w: number; h: number; fill: string };

/** A context that records what was painted. */
function recordingContext() {
  const rects: Rect[] = [];
  const ctx = {
    fillStyle: "",
    font: "",
    textAlign: "left",
    textBaseline: "alphabetic",
    fillRect: vi.fn(function (this: { fillStyle: string }, x: number, y: number, w: number, h: number) {
      rects.push({ x, y, w, h, fill: ctx.fillStyle });
    }),
    fillText: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, rects, raw: ctx };
}

const colours: Colours = { "#": "#111", s: "#222", f: "#333", a: "#444", b: "#555" };
const assets = (over: Partial<{ reduceMotion: boolean; frame: number }> = {}) => ({
  cat: CAT.default.walk,
  hop: CAT.default.hop,
  sleep: CAT.default.sleep,
  colours,
  frame: 0,
  reduceMotion: false,
  ...over,
});
const inside = (r: Rect, box: { x: number; y: number; w: number; h: number }) =>
  r.x >= box.x && r.x + r.w <= box.x + box.w && r.y >= box.y && r.y + r.h <= box.y + box.h;

function scene(over: Partial<GameState> = {}): GameState {
  return {
    ...createGame(0, () => 0.5),
    obstacles: [
      { kind: "box", x: 120, ...OBSTACLE_SIZE.box },
      { kind: "cucumber", x: 200, ...OBSTACLE_SIZE.cucumber },
    ],
    ...over,
  };
}

describe("render", () => {
  it("paints the cat and every visible obstacle", () => {
    const { ctx, rects } = recordingContext();
    const s = scene();
    render(ctx, s, assets());
    const catBox = { x: WORLD.catX, y: s.catY - CAT.default.walk.h, w: CAT.default.walk.w, h: CAT.default.walk.h };
    expect(rects.filter((r) => inside(r, catBox)).length).toBeGreaterThan(0);
    for (const o of s.obstacles) {
      const box = { x: o.x, y: WORLD.ground - o.h, w: o.w, h: o.h };
      expect(rects.filter((r) => inside(r, box) && r.fill !== colours.b).length).toBeGreaterThan(0);
    }
    // only real palette colours are painted
    for (const r of rects) expect(Object.values(colours)).toContain(r.fill);
  });

  it("draws the cat airborne with its hop sprite at feet − height", () => {
    const { ctx, rects } = recordingContext();
    const s = scene({ obstacles: [], airborne: true, catY: 80 });
    render(ctx, s, assets());
    const top = 80 - CAT.default.hop.h;
    expect(rects.some((r) => r.x >= WORLD.catX && r.x < WORLD.catX + 24 && r.y >= top && r.y < 80)).toBe(true);
    expect(rects.some((r) => r.x >= WORLD.catX && r.x < WORLD.catX + 24 && r.y >= 80 && r.y < WORLD.ground && r.y !== 90)).toBe(false); // y 90: the horizon dots
  });

  it("shakes on game over, but not under reduced motion", () => {
    const shaking = recordingContext();
    render(shaking.ctx, scene({ over: true, shake: 0.1 }), assets());
    expect(shaking.raw.translate).toHaveBeenCalled();
    expect(shaking.raw.save).toHaveBeenCalled();
    expect(shaking.raw.restore).toHaveBeenCalled();

    const still = recordingContext();
    render(still.ctx, scene({ over: true, shake: 0.1 }), assets({ reduceMotion: true }));
    expect(still.raw.translate).not.toHaveBeenCalled();
  });

  /** The score's area: five 3×5 digits at scale 2, right-aligned 4 px from the top-right. */
  const SCORE_BOX = { x: WORLD.w - 4 - (5 * 7 - 1), y: 4, w: 5 * 7 - 1, h: 10 };
  const scoreRects = (rects: Rect[]) => rects.filter((r) => inside(r, SCORE_BOX) && r.fill !== colours.b);

  it("draws the score top-right in pixel digits, never with text", () => {
    const { ctx, rects, raw } = recordingContext();
    render(ctx, scene({ score: 42 }), assets());
    expect(raw.fillText).not.toHaveBeenCalled();
    const painted = scoreRects(rects);
    // "00042": the four zeros' and the 2's lit cells, each 2×2 world px (runs are merged along a row)
    const cells = (d: string) => DIGITS[d].join("").replace(/\./g, "").length;
    const area = painted.reduce((sum, r) => sum + r.w * r.h, 0);
    expect(area).toBe(4 * (3 * cells("0") + cells("4") + cells("2")));
    for (const r of painted) expect(r.fill).toBe(colours.s);
    // the rightmost digit ends 4 px from the edge
    expect(Math.max(...painted.map((r) => r.x + r.w))).toBe(WORLD.w - 4);
  });

  it("flashes the score in the accent after each hundred, on a clock (not the frame rate); not under reduced motion", () => {
    const on = recordingContext();
    render(on.ctx, scene({ score: 200, t: 0.05 }), assets());
    expect(scoreRects(on.rects).length).toBeGreaterThan(0);
    for (const r of scoreRects(on.rects)) expect(r.fill).toBe(colours.a);

    // the same moment at a different rAF tick count looks the same
    const sameT = recordingContext();
    render(sameT.ctx, scene({ score: 200, t: 0.05 }), assets({ frame: 7 }));
    expect(sameT.rects).toEqual(on.rects);

    const off = recordingContext();
    render(off.ctx, scene({ score: 200, t: 0.2 }), assets());
    expect(scoreRects(off.rects)).toHaveLength(0);

    const reduced = recordingContext();
    render(reduced.ctx, scene({ score: 200, t: 0.2 }), assets({ reduceMotion: true }));
    expect(scoreRects(reduced.rects).length).toBeGreaterThan(0);
    for (const r of scoreRects(reduced.rects)) expect(r.fill).toBe(colours.s);
  });

  it("paints the stars as single faint pixels, fixed in place", () => {
    expect(STARS).toHaveLength(10);
    for (const s of [scene(), scene({ distance: 500, t: 3 })]) {
      const { ctx, rects } = recordingContext();
      render(ctx, s, assets());
      for (const [x, y] of STARS) {
        expect(y).toBeGreaterThanOrEqual(10);
        expect(y).toBeLessThanOrEqual(60);
        expect(rects.some((r) => r.x === x && r.y === y && r.w === 1 && r.h === 1 && r.fill === colours.f)).toBe(true);
      }
    }
  });

  it("draws a sparse faint horizon at y 90 that scrolls at a quarter of the distance", () => {
    const at = (distance: number) => {
      const { ctx, rects } = recordingContext();
      render(ctx, scene({ distance, obstacles: [] }), assets());
      return rects.filter((r) => r.y === 90 && r.fill === colours.f).map((r) => r.x);
    };
    const start = at(0);
    expect(start.length).toBeGreaterThan(5);
    expect(start.length).toBeLessThan(WORLD.w / 3); // sparse
    // 8 px run → the horizon moved 2 px left
    expect(at(8).map((x) => x + 2).filter((x) => x < WORLD.w)).toEqual(start.filter((x) => x >= 2));
    expect(at(8)).not.toEqual(start);
  });

  it("the shake jitter follows the game clock, not the frame count", () => {
    const a = recordingContext();
    render(a.ctx, scene({ over: true, shake: 0.1, t: 1 }), assets({ frame: 1 }));
    const b = recordingContext();
    render(b.ctx, scene({ over: true, shake: 0.1, t: 1 }), assets({ frame: 2 }));
    expect(a.raw.translate.mock.calls).toEqual(b.raw.translate.mock.calls);
  });
});

describe("resolvePalette", () => {
  it("reads each PALETTE token from the element's computed style", () => {
    const el = document.createElement("div");
    el.style.setProperty("--color-ink", "#010101");
    el.style.setProperty("--color-ink-soft", "#020202");
    el.style.setProperty("--color-ink-faint", "#030303");
    el.style.setProperty("--color-accent", "#040404");
    el.style.setProperty("--color-bg", "#050505");
    document.body.append(el);
    expect(resolvePalette(el)).toEqual({ "#": "#010101", s: "#020202", f: "#030303", a: "#040404", b: "#050505" });
    el.remove();
  });

  it("falls back to a real colour when a token is missing", () => {
    const el = document.createElement("div");
    document.body.append(el);
    const c = resolvePalette(el);
    for (const ch of ["#", "s", "f", "a", "b"]) expect(c[ch]).toMatch(/^#[0-9a-f]{3,6}$/i);
    el.remove();
  });
});
