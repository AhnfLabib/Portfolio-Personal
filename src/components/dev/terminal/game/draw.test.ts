import { describe, expect, it, vi } from "vitest";
import { CAT } from "../sprites";
import { WORLD, createGame, type GameState } from "./engine";
import { OBSTACLE_SIZE } from "./gameSprites";
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
    expect(rects.some((r) => r.x >= WORLD.catX && r.x < WORLD.catX + 24 && r.y >= 80 && r.y < WORLD.ground)).toBe(false);
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

  it("draws the score top-right, and skips the flash under reduced motion", () => {
    const plain = recordingContext();
    render(plain.ctx, scene({ score: 42 }), assets());
    expect(plain.raw.fillText).toHaveBeenCalledWith("00042", expect.any(Number), expect.any(Number));

    // just past a hundred, on an "off" beat of the flash: hidden normally, always shown under reduced motion
    const flash = recordingContext();
    render(flash.ctx, scene({ score: 200 }), assets({ frame: 4 }));
    expect(flash.raw.fillText).not.toHaveBeenCalled();
    const reduced = recordingContext();
    render(reduced.ctx, scene({ score: 200 }), assets({ frame: 4, reduceMotion: true }));
    expect(reduced.raw.fillText).toHaveBeenCalledWith("00200", expect.any(Number), expect.any(Number));
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
