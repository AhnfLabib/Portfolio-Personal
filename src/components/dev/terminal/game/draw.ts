import { PALETTE, type Sprite } from "../sprites";
import { WORLD, type GameState } from "./engine";
import { BOX, CUCUMBER, GROUND_DASH } from "./gameSprites";

/** Palette char → a real colour the canvas can paint with. */
export type Colours = Record<string, string>;

export interface Assets {
  /** The run cycle (the cat's `walk` pose). */
  cat: Sprite;
  hop: Sprite;
  sleep: Sprite;
  colours: Colours;
  /** A rAF tick counter: drives the shake jitter and the score flash. */
  frame: number;
  reduceMotion: boolean;
}

/** Used when a token resolves to nothing (no stylesheet, e.g. in tests). */
const FALLBACK: Colours = { "#": "#e7ecf4", s: "#94a3b8", f: "#5b6779", a: "#a3e635", b: "#0a0d13" };
const TOKEN = /var\((--[\w-]+)\)/;

/** Resolve the five PALETTE tokens (`var(--color-ink)` etc.) on `el`, once per open. */
export function resolvePalette(el: Element): Colours {
  const style = getComputedStyle(el);
  const out: Colours = {};
  for (const [ch, value] of Object.entries(PALETTE)) {
    const name = TOKEN.exec(value)?.[1];
    const resolved = name ? style.getPropertyValue(name).trim() : "";
    out[ch] = resolved || FALLBACK[ch] || "#888";
  }
  return out;
}

type Run = { x: number; y: number; w: number; ch: string };
const runCache = new WeakMap<string[], Run[]>();

/** A grid's horizontal same-colour runs (cached per grid), so each run is one fillRect. */
function runsOf(grid: string[]): Run[] {
  let runs = runCache.get(grid);
  if (runs) return runs;
  runs = [];
  grid.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let w = 1;
      while (x + w < row.length && row[x + w] === ch) w++;
      if (ch !== "." && ch in PALETTE) runs!.push({ x, y, w, ch });
      x += w;
    }
  });
  runCache.set(grid, runs);
  return runs;
}

function paint(ctx: CanvasRenderingContext2D, grid: string[], left: number, top: number, colours: Colours) {
  const x0 = Math.round(left);
  const y0 = Math.round(top);
  for (const r of runsOf(grid)) {
    ctx.fillStyle = colours[r.ch];
    ctx.fillRect(x0 + r.x, y0 + r.y, r.w, 1);
  }
}

const frameAt = (sprite: Sprite, seconds: number) =>
  sprite.frames.length < 2 || !sprite.ms ? 0 : Math.floor((seconds * 1000) / sprite.ms) % sprite.frames.length;

const SCORE_FONT = '8px "JetBrains Mono", ui-monospace, "SFMono-Regular", monospace';
/** The score flashes for this many points after each hundred. */
const FLASH_POINTS = 3;

/** Paint one frame of Cat Dash in logical 240×135 units (the caller applies the dpr transform). */
export function render(ctx: CanvasRenderingContext2D, s: GameState, a: Assets): void {
  const { colours, reduceMotion, frame } = a;
  const shaking = s.shake > 0 && !reduceMotion;
  if (shaking) {
    ctx.save();
    const dx = frame % 2 === 0 ? 2 : -2;
    const dy = frame % 3 === 0 ? 1 : -1;
    ctx.translate(dx, dy);
  }

  ctx.fillStyle = colours.b;
  ctx.fillRect(-4, -4, WORLD.w + 8, WORLD.h + 8);

  // The floor and its scrolling dashes.
  ctx.fillStyle = colours.s;
  ctx.fillRect(0, WORLD.ground, WORLD.w, 1);
  const tile = GROUND_DASH[0].length;
  const offset = -(s.distance % tile);
  for (let x = offset; x < WORLD.w; x += tile) paint(ctx, GROUND_DASH, x, WORLD.ground + 3, colours);

  for (const o of s.obstacles) paint(ctx, o.kind === "box" ? BOX : CUCUMBER, o.x, WORLD.ground - o.h, colours);

  // The cat: feet at catY. Asleep once it is over, mid-hop in the air, else running.
  const sprite = s.over ? a.sleep : s.airborne ? a.hop : a.cat;
  const index = s.over ? frameAt(sprite, s.t) : s.airborne ? sprite.frames.length - 1 : frameAt(sprite, s.t);
  paint(ctx, sprite.frames[index] ?? sprite.frames[0], WORLD.catX, s.catY - sprite.h, colours);

  // The score, top-right; it blinks for a moment after each hundred (not under reduced motion).
  const flashing = !reduceMotion && s.score >= 100 && s.score % 100 < FLASH_POINTS;
  if (!flashing || Math.floor(frame / 4) % 2 === 0) {
    ctx.fillStyle = flashing ? colours.a : colours.s;
    ctx.font = SCORE_FONT;
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillText(String(s.score).padStart(5, "0"), WORLD.w - 6, 6);
  }

  if (shaking) ctx.restore();
}
