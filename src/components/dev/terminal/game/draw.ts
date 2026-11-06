import { PALETTE, type Sprite } from "../sprites";
import { WORLD, type GameState } from "./engine";
import { BOX, CUCUMBER, DIGITS, GROUND_DASH, STARS } from "./gameSprites";

/** Palette char → a real colour the canvas can paint with. */
export type Colours = Record<string, string>;

export interface Assets {
  /** The run cycle (the cat's `walk` pose). */
  cat: Sprite;
  hop: Sprite;
  sleep: Sprite;
  colours: Colours;
  /** The rAF tick count. Timing (shake jitter, score flash) follows the game clock `s.t` instead, so every refresh rate looks the same. */
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

/** Paint a grid at (left, top), each cell `scale` world px; `fill` paints every lit cell in one colour. */
function paint(ctx: CanvasRenderingContext2D, grid: string[], left: number, top: number, colours: Colours, scale = 1, fill?: string) {
  const x0 = Math.round(left);
  const y0 = Math.round(top);
  for (const r of runsOf(grid)) {
    ctx.fillStyle = fill ?? colours[r.ch];
    ctx.fillRect(x0 + r.x * scale, y0 + r.y * scale, r.w * scale, scale);
  }
}

const frameAt = (sprite: Sprite, seconds: number) =>
  sprite.frames.length < 2 || !sprite.ms ? 0 : Math.floor((seconds * 1000) / sprite.ms) % sprite.frames.length;

/** The score flashes for this many points after each hundred, blinking at FLASH_HZ on the game clock. */
const FLASH_POINTS = 3;
const FLASH_HZ = 4;
/** Shake jitter changes direction this often (game clock). */
const SHAKE_HZ = 30;
const DIGIT_SCALE = 2;
const DIGIT_ADVANCE = 3 * DIGIT_SCALE + 1; // 6 px wide + a 1 px gap
const SCORE_MARGIN = 4;
const HORIZON_Y = 90;
const HORIZON_EVERY = 8; // one dot every 8 px
const HORIZON_PARALLAX = 0.25;

/** Paint one frame of Cat Dash in logical 240×135 units (the caller applies the dpr transform). */
export function render(ctx: CanvasRenderingContext2D, s: GameState, a: Assets): void {
  const { colours, reduceMotion } = a;
  const shaking = s.shake > 0 && !reduceMotion;
  if (shaking) {
    ctx.save();
    const tick = Math.floor(s.t * SHAKE_HZ);
    ctx.translate(tick % 2 === 0 ? 2 : -2, tick % 3 === 0 ? 1 : -1);
  }

  ctx.fillStyle = colours.b;
  ctx.fillRect(-4, -4, WORLD.w + 8, WORLD.h + 8);

  // A still, faint sky: fixed stars, and a sparse horizon drifting at a quarter of the run's speed.
  ctx.fillStyle = colours.f;
  for (const [x, y] of STARS) ctx.fillRect(x, y, 1, 1);
  const drift = (s.distance * HORIZON_PARALLAX) % HORIZON_EVERY;
  for (let x = Math.round(HORIZON_EVERY - drift) % HORIZON_EVERY; x < WORLD.w; x += HORIZON_EVERY) ctx.fillRect(x, HORIZON_Y, 1, 1);

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
  if (!flashing || Math.floor(s.t * FLASH_HZ * 2) % 2 === 0) {
    const text = String(s.score).padStart(5, "0");
    const left = WORLD.w - SCORE_MARGIN - (text.length * DIGIT_ADVANCE - 1);
    const fill = flashing ? colours.a : colours.s;
    [...text].forEach((d, i) => paint(ctx, DIGITS[d], left + i * DIGIT_ADVANCE, SCORE_MARGIN, colours, DIGIT_SCALE, fill));
  }

  if (shaking) ctx.restore();
}
