import type { SkinName } from "./commands";

/** char → CSS colour token. "." is transparent and never appears here. */
export type Palette = Record<string, string>;
/**
 * Each frame is `h` strings of `w` chars. With more than one frame the sprite
 * animates: a frame every `ms`, looping unless `loop` is false (then it holds
 * the last frame).
 */
export interface Sprite {
  w: number;
  h: number;
  frames: string[][];
  ms: number;
  loop: boolean;
}
export type CatPose =
  | "sit"
  | "tail-flick"
  | "groom"
  | "stretch"
  | "yawn"
  | "sleep"
  | "look"
  | "walk"
  | "hop"
  | "purr"
  | "shades"
  | "look-l"
  | "look-r"
  | "look-up"
  | "paw"
  | "hop-react"
  | "slow-blink"
  | "think"
  | "happy"
  | "love";

export const PALETTE: Palette = {
  "#": "var(--color-ink)",
  s: "var(--color-ink-soft)",
  f: "var(--color-ink-faint)",
  a: "var(--color-accent)",
  b: "var(--color-bg)",
};

export function toRects(frame: string[], palette: Palette): { x: number; y: number; fill: string }[] {
  const rects: { x: number; y: number; fill: string }[] = [];
  frame.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const fill = palette[row[x]];
      if (fill) rects.push({ x, y, fill });
    }
  });
  return rects;
}

/* ── frame helpers ─────────────────────────────────────────────────────────
 * stamp:   paint a layer onto a frame at (top, left); "_" in the layer keeps
 *          the pixel underneath, any other char (including ".") replaces it.
 * part:    a drawing whose "." means "keep" (a cut-out to stamp anywhere).
 * recolor: swap chars everywhere (simultaneous, so { s: "f", f: "s" } works).
 * shift:   move rows [from, to) sideways by dx (vacated pixels go clear).
 * lower / lift: the whole figure n pixels down / up (clear rows fill in).
 * outline: a 1-px bg line around every shape, so light fills stand apart from
 *          the title bar and the card's border.
 */
type Frame = string[];
type Stamp = [layer: Frame, top: number, left: number];

function stamp(frame: Frame, layer: Frame, top = 0, left = 0): Frame {
  return frame.map((row, y) => {
    const src = layer[y - top];
    if (src === undefined) return row;
    const chars = row.split("");
    for (let i = 0; i < src.length; i++) if (src[i] !== "_" && chars[left + i] !== undefined) chars[left + i] = src[i];
    return chars.join("");
  });
}

const withStamp = (frame: Frame, [layer, top, left]: Stamp): Frame => stamp(frame, layer, top, left);
const stamps = (frame: Frame, ...layers: Stamp[]): Frame => layers.reduce(withStamp, frame);
const part = (...rows: string[]): Frame => rows.map((r) => r.replace(/\./g, "_"));
const blank = (w: number, h: number): Frame => Array.from({ length: h }, () => ".".repeat(w));

function recolor(frame: Frame, map: Record<string, string>): Frame {
  return frame.map((row) => row.replace(/./g, (c) => map[c] ?? c));
}

function shift(frame: Frame, from: number, to: number, dx: number): Frame {
  return frame.map((row, y) => {
    if (y < from || y >= to || dx === 0) return row;
    return dx < 0 ? row.slice(-dx) + ".".repeat(-dx) : ".".repeat(dx) + row.slice(0, row.length - dx);
  });
}

const lower = (frame: Frame, n = 1): Frame => [...blank(frame[0].length, n), ...frame.slice(0, frame.length - n)];
const lift = (frame: Frame, n = 1): Frame => [...frame.slice(n), ...blank(frame[0].length, n)];

function outline(frame: Frame): Frame {
  const at = (x: number, y: number) => frame[y]?.[x] ?? ".";
  return frame.map((row, y) =>
    [...row]
      .map((c, x) => (c === "." && [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)].some((n) => n !== ".") ? "b" : c))
      .join(""),
  );
}

const anim = (ms: number, frames: Frame[], loop = true) => ({ ms, frames, loop });
type Anim = ReturnType<typeof anim>;

function toSprite({ ms, frames, loop }: Anim): Sprite {
  return { w: frames[0][0].length, h: frames[0].length, frames, ms: frames.length > 1 ? ms : 0, loop };
}

/* ── Cat: 24×24, faces right, 1.33 px per pixel (32 px tall) ──────────────
 * s ink-soft: fur    # ink: belly, muzzle, socks    f ink-faint: inner ears, nose
 * b bg: eyes, gaps, the outline     a accent: the collar (and hearts, z's)
 * Every frame is a body with one of two heads stamped where the pose holds it.
 */
const HEAD_FRONT: Frame = part(
  "s........s",
  "ss......ss",
  "sfs....sfs",
  "ssssssssss",
  "ssbssssbss",
  "ssbssssbss",
  "sss#ff#sss",
  ".ss####ss.",
  "..ss##ss..",
);
const HEAD_SIDE: Frame = part(
  ".s....s...",
  ".ss..sss..",
  ".sssssfs..",
  "sssssssss.",
  "ssssssbss.",
  "ssssssbsss",
  "ssssssss#f",
  ".sssss####",
  "..ssss##..",
);
type HeadKind = "front" | "side";
const HEADS: Record<HeadKind, Frame> = { front: HEAD_FRONT, side: HEAD_SIDE };
/** Head layers, relative to the head's top-left; the collar is the cat's one accent. */
const HEAD_FACE: Record<HeadKind, { eyes: [number, number][]; lenses: Stamp; beret: Stamp; mouth: [number, number]; collar: Stamp }> = {
  front: { eyes: [[4, 2], [4, 7]], lenses: [["bbbbbbbbbb", "_bbb__bbb_"], 4, 0], beret: [part("..a..", ".aaa.", "aaaaa"), 0, 3], mouth: [7, 4], collar: [["aaaa"], 9, 3] },
  side: { eyes: [[4, 6]], lenses: [["_bbbbbb", "____bbb"], 4, 3], beret: [part("..a..", ".aaa.", "aaaaa"), 0, 1], mouth: [7, 7], collar: [["aaa"], 8, 1] },
};
type HeadSpec = { kind: HeadKind; row: number; col: number; eyes?: "open" | "shut" | "glad" | "up"; mouth?: Frame };

function head({ kind, row, col, eyes = "open", mouth }: HeadSpec): Stamp[] {
  const out: Stamp[] = [[HEADS[kind], row, col]];
  for (const [r, c] of HEAD_FACE[kind].eyes) {
    if (eyes === "shut") out.push([["s", "b"], row + r, col + c]);
    if (eyes === "up") out.push([["b", "b", "s"], row + r - 1, col + c]);
    if (eyes === "glad") out.push([["b", "s"], row + r, col + c], [["s", "b"], row + r, col + c + (kind === "front" && c > 4 ? 1 : -1)]);
  }
  if (mouth) out.push([mouth, row + HEAD_FACE[kind].mouth[0], col + HEAD_FACE[kind].mouth[1] - 1]);
  const [collar, r, c] = HEAD_FACE[kind].collar;
  out.push([collar, row + r, col + c]);
  return out;
}

interface CatFrame {
  frame: Frame;
  head: HeadSpec;
}
const catFrame = (body: Frame, h: HeadSpec, ...extra: Stamp[]): CatFrame => ({ frame: stamps(body, ...head(h), ...extra), head: h });

/* Sitting: haunch, chest and two front legs with socks; the tail is stamped. */
const SIT_BODY: Frame = [
  ...blank(24, 12),
  ".............sssssss....",
  "...........ssss####ss...",
  ".........ssssss#####s...",
  "........sssssss#####s...",
  ".......sssssssss####s...",
  ".......sssssssss####s...",
  "......ssssssssss####s...",
  "......ssssssssbssbsss...",
  "......ssssssssbssbsss...",
  "......ssssssssbssbssss..",
  "......ssssssssbssbssss..",
  ".......ssssssss##b##ss..",
];
const SIT_HEAD: HeadSpec = { kind: "front", row: 4, col: 11 };
/** A long tail rising behind the haunch in an S, the tip swaying. */
const TAIL_BODY = ["ss.....", ".s.....", ".s.....", ".ss....", "..s....", "..s....", "..ss...", "...ss..", "....sss"];
const TAIL_DOWN: Stamp = [part("ss.....", "s......", "s......", ...TAIL_BODY), 12, 1];
const TAIL_SWAY: Stamp = [part("..ss...", ".s.....", "s......", ...TAIL_BODY), 12, 1];
const TAIL_HIGH: Stamp = [part("ss......", "..s.....", "..s.....", "..s.....", "...s....", "...ss...", "....sss."), 11, 1];
const TAIL_HOOK: Stamp = [part(".ss.....", "s.......", "s.......", ".s......", "..s.....", "...ss...", "....sss."), 11, 1];
/** The right ear flicks down: its tip goes, the inner ear shows lower. */
const EAR_TWITCH: Stamp = [["_________.", "_______s#s"], 4, 11];
const ZZ = (n: number): Stamp => [n ? part("aaa...", ".a....", "aaa.aa", "......", "....a.") : part("......", "aa....", "a.....", "aa....", "......"), 6, 16];

const sitFrame = (tail: Stamp, h: Partial<HeadSpec> = {}, ...extra: Stamp[]) =>
  catFrame(stamps(SIT_BODY, tail), { ...SIT_HEAD, ...h }, ...extra);

/* Standing / walking: a long body (rows 11–17); legs, tail and head stamped. */
const WALK_BODY: Frame = [
  ...blank(24, 11),
  "....sssssssssssss.......",
  "...sssssssssssssss......",
  "..ssssssssssssssss......",
  "..ssssssssssssssss......",
  "..ssssssssssssssss......",
  "...sss#########ss.......",
  "....ss########ss........",
  ...blank(24, 6),
];
/** A leg from `top` to the ground: 3 rows at `col`, the rest at `col + dx`, a sock at the bottom. */
function leg(col: number, dx: number, top = 18, bottom = 23): Stamp {
  const n = bottom - top + 1;
  return [Array.from({ length: n }, (_, i) => "_".repeat(i < 3 ? col : col + dx) + (i === n - 1 ? "##" : "ss")), top, 0];
}
const TAIL_UP_A: Stamp = [part("s...", "ss..", ".s..", ".s..", ".ss.", "..s.", "..ss"), 5, 1];
const TAIL_UP_B: Stamp = [part(".s..", "ss..", "s...", "s...", "ss..", ".ss.", "..ss"), 5, 1];

const walkFrame = (legs: [number, number][], tail: Stamp, bob: 0 | 1, headKind: HeadKind = "side") => {
  const body = bob ? lower(WALK_BODY) : WALK_BODY;
  return catFrame(stamps(body, tail, ...legs.map(([c, dx]) => leg(c, dx))), { kind: headKind, row: 5 + bob, col: 13 });
};

/* Stretch: rump up and front paws reaching forward along the ground. */
const STRETCH_BODY: Frame = [
  ...blank(24, 9),
  "..ssssss................",
  "..sssssssss.............",
  "..ssssssssssss..........",
  "..ssssssssssssssss......",
  "..ssss#######sssss......",
  "..ss.ss..#####ssss......",
  "..ss.ss.....sssssss.....",
  "..ss.ss.......ssssss....",
  "..ss.ss.................",
  "..ss.ss.................",
  "..ss.ss.................",
  "..ss.ss.................",
  "..ss.ss.....ssssssssss..",
  "..##.##.....ssssssss##..",
  ...blank(24, 1),
].slice(0, 24);
const TAIL_STRETCH_A: Stamp = [part("s...", "s...", "ss..", ".s.."), 5, 2];
const TAIL_STRETCH_B: Stamp = [part("..s.", ".s..", "ss..", ".s.."), 5, 2];

/* Sleeping: a loaf, head down on the paws; it breathes. */
const SLEEP_BODY: Frame = [
  ...blank(24, 13),
  ".....ssssssssss.........",
  "...ssssssssssssss.......",
  "..ssssssssssssssss......",
  ".ssssssssssssssssss.....",
  ".ssssssssssssssssss.....",
  ".ssssssssssssssssss.....",
  ".ssssssssssssssssss.....",
  ".ssssssssssssssssss.....",
  ".ssssssssssssssssss.....",
  "..ssssssssssssssssssss..",
  "...###..........##......",
];
/** The tail arches up from the rump and rests along the back; it rises with the breath. */
const TAIL_SLEEP = (up: number): Stamp => [part("..sss....", ".s...s...", "s.....s..", "s........", "s........"), 10 - up, 1];
const SLEEP_HEAD: HeadSpec = { kind: "front", row: 14, col: 13, eyes: "shut" };
const HEART = (top: number, left: number): Stamp => [part(".a.a.", "aaaaa", ".aaa.", "..a.."), top, left];
const SMALL_HEART = (top: number, left: number): Stamp => [part("a.a", ".a."), top, left];
const PAW = (row: number): Stamp => [["##", "##"], row, 20];
const NO_RIGHT_LEG: Stamp = [Array.from({ length: 5 }, () => ".."), 19, 18];

/** Sitting, the side head turned toward the visitor (to the right; look-l is its mirror). */
const LOOK_HEAD: Partial<HeadSpec> = { kind: "side", col: 12 };
/** The swiping paw: raised, then batting forward. */
const SWIPE_UP: Stamp = [["##", "##"], 13, 20];
const SWIPE_OUT: Stamp = [["###", "###"], 14, 20];
/** Up in the air: the whole sitting cat (and its head, for the skins) lifted n pixels. */
const liftCat = ({ frame, head: h }: CatFrame, n: number): CatFrame => ({ frame: lift(frame, n), head: { ...h, row: h.row - n } });

/** Thought dots over the head: 2×2 ink, 2 px apart, each new one a row higher. */
const THOUGHT: Stamp[] = [
  [["##", "##"], 2, 13],
  [["##", "##"], 1, 17],
  [["##", "##"], 0, 21],
];
/** A blush on both cheeks of the sitting front head. */
const BLUSH: Stamp[] = [
  [["a"], SIT_HEAD.row + 6, SIT_HEAD.col + 1],
  [["a"], SIT_HEAD.row + 6, SIT_HEAD.col + 8],
];

type PoseDef = { ms: number; loop?: boolean; mirror?: boolean; frames: CatFrame[] };
const LOOK_R: PoseDef = { ms: 600, frames: [sitFrame(TAIL_DOWN, LOOK_HEAD), sitFrame(TAIL_SWAY, LOOK_HEAD)] };

const CAT_POSES: Record<CatPose, PoseDef> = {
  // tail sways every 600 ms; every few sways an ear twitches
  sit: {
    ms: 600,
    frames: [
      sitFrame(TAIL_DOWN),
      sitFrame(TAIL_SWAY),
      sitFrame(TAIL_DOWN),
      sitFrame(TAIL_SWAY),
      sitFrame(TAIL_DOWN, {}, EAR_TWITCH),
      sitFrame(TAIL_SWAY),
    ],
  },
  "tail-flick": { ms: 220, frames: [sitFrame(TAIL_HIGH), sitFrame(TAIL_HOOK)] },
  // paw up to the mouth, a lick, paw over the cheek
  groom: {
    ms: 300,
    frames: [
      sitFrame(TAIL_DOWN, { row: 5, eyes: "shut" }, NO_RIGHT_LEG, PAW(15)),
      sitFrame(TAIL_DOWN, { row: 5, eyes: "shut", mouth: ["a"] }, NO_RIGHT_LEG, PAW(12)),
      sitFrame(TAIL_DOWN, { row: 5, eyes: "shut" }, NO_RIGHT_LEG, PAW(9)),
    ],
  },
  stretch: {
    ms: 500,
    frames: [
      catFrame(stamps(STRETCH_BODY, TAIL_STRETCH_A), { kind: "front", row: 12, col: 13, eyes: "shut" }),
      catFrame(stamps(shift(STRETCH_BODY, 21, 23, 1), TAIL_STRETCH_B), { kind: "front", row: 13, col: 13, eyes: "shut" }),
    ],
  },
  // waking: a small yawn, then a wide one
  yawn: {
    ms: 500,
    loop: false,
    frames: [
      sitFrame(TAIL_DOWN, { eyes: "shut", mouth: ["bb"] }),
      sitFrame(TAIL_DOWN, { eyes: "shut", mouth: ["bbb", "bab"] }),
    ],
  },
  // slow breathing: the loaf rises a pixel, the z's drift
  sleep: {
    ms: 1000,
    frames: [
      catFrame(SLEEP_BODY, SLEEP_HEAD, TAIL_SLEEP(0), ZZ(0)),
      catFrame(stamps(SLEEP_BODY, [part(".....ssssssssss."), 12, 0], [part("...sssssssssssssss"), 13, 0]), SLEEP_HEAD, TAIL_SLEEP(1), ZZ(1)),
    ],
  },
  // stopped mid-walk, looking at the visitor
  look: { ms: 0, frames: [walkFrame([[4, 0], [6, 0], [13, 0], [15, 0]], TAIL_UP_A, 0, "front")] },
  walk: {
    ms: 150,
    frames: [
      walkFrame([[3, -1], [7, 1], [13, 0], [15, 0]], TAIL_UP_A, 0),
      walkFrame([[4, 0], [6, 0], [13, 0], [15, 0]], TAIL_UP_B, 1),
      walkFrame([[4, 0], [6, 0], [12, -1], [16, 1]], TAIL_UP_A, 0),
      walkFrame([[4, 0], [7, 0], [12, 0], [15, 0]], TAIL_UP_B, 1),
    ],
  },
  // a short crouch, then up and over
  hop: {
    ms: 120,
    loop: false,
    frames: [
      catFrame(stamps(lower(WALK_BODY, 3), TAIL_UP_B, leg(3, 1, 21), leg(6, 1, 21), leg(13, 1, 21), leg(15, 1, 21)), { kind: "side", row: 9, col: 13 }),
      catFrame(
        stamps(lift(WALK_BODY, 2), [part("ss....", ".sss..", "...sss"), 8, 1], leg(3, -2, 16, 20), leg(6, -2, 16, 20), leg(13, 2, 16, 20), leg(15, 2, 16, 20)),
        { kind: "side", row: 3, col: 13 },
      ),
    ],
  },
  // eyes squeezed happy, hearts floating up
  purr: {
    ms: 400,
    frames: [
      sitFrame(TAIL_SWAY, { eyes: "glad" }, HEART(1, 4), SMALL_HEART(4, 1)),
      sitFrame(TAIL_DOWN, { eyes: "glad" }, HEART(0, 4), SMALL_HEART(2, 1)),
    ],
  },
  shades: { ms: 600, frames: [sitFrame(TAIL_DOWN), sitFrame(TAIL_SWAY)] },
  // the cursor is near: head (and, mirrored, the whole cat) turned to it
  "look-r": LOOK_R,
  "look-l": { ...LOOK_R, mirror: true },
  // the cursor is above: front face, eyes raised
  "look-up": { ms: 600, frames: [sitFrame(TAIL_DOWN, { row: 3, eyes: "up" }), sitFrame(TAIL_SWAY, { row: 3, eyes: "up" })] },
  // one swipe at a close cursor: paw up, then out (2 × 150 ms)
  paw: {
    ms: 150,
    loop: false,
    frames: [sitFrame(TAIL_HIGH, LOOK_HEAD, NO_RIGHT_LEG, SWIPE_UP), sitFrame(TAIL_HOOK, LOOK_HEAD, NO_RIGHT_LEG, SWIPE_OUT)],
  },
  // clicked the first time: startled, a hop straight up and down
  "hop-react": (() => {
    const startled = sitFrame(TAIL_HIGH, { mouth: ["b"] });
    return { ms: 150, loop: false, frames: [startled, liftCat(startled, 3), startled] };
  })(),
  // a slow blink (cat for "I like you"), with a little nod
  // an ask in flight: upright, looking up, the thought dots filling in one by one
  think: { ms: 400, frames: [1, 2, 3].map((n) => sitFrame(TAIL_DOWN, { eyes: "up" }, ...THOUGHT.slice(0, n))) },
  // the answer landed: ears up, eyes glad, tail high and twitching
  happy: { ms: 250, frames: [sitFrame(TAIL_HIGH, { row: 3, eyes: "glad" }), sitFrame(TAIL_HOOK, { row: 3, eyes: "glad" })] },
  // shy and lovey: a blush, half-closed eyes, small hearts drifting up
  love: {
    ms: 500,
    frames: [
      sitFrame(TAIL_SWAY, { eyes: "shut" }, ...BLUSH, SMALL_HEART(7, 6), SMALL_HEART(4, 2)),
      sitFrame(TAIL_DOWN, { eyes: "shut" }, ...BLUSH, SMALL_HEART(5, 6), SMALL_HEART(2, 2)),
      sitFrame(TAIL_SWAY, { eyes: "shut" }, ...BLUSH, SMALL_HEART(3, 6), SMALL_HEART(0, 2)),
    ],
  },
  "slow-blink": { ms: 500, loop: false, frames: [sitFrame(TAIL_SWAY), sitFrame(TAIL_SWAY, { row: 5, eyes: "shut" }), sitFrame(TAIL_SWAY)] },
};

const catLenses = (frame: Frame, { kind, row, col }: HeadSpec): Frame => withStamp(frame, [HEAD_FACE[kind].lenses[0], row + HEAD_FACE[kind].lenses[1], col + HEAD_FACE[kind].lenses[2]]);
const catBeret = (frame: Frame, { kind, row, col }: HeadSpec): Frame => withStamp(frame, [HEAD_FACE[kind].beret[0], row + HEAD_FACE[kind].beret[1], col + HEAD_FACE[kind].beret[2]]);

const CAT_SKINS: Record<SkinName, (frame: Frame, h: HeadSpec) => Frame> = {
  default: (f) => f,
  hacker: (f) => recolor(f, { f: "s", s: "f" }),
  artist: catBeret,
  shades: catLenses,
};

/* The `shades` pose always wears lenses (stamped after the skin, so a recolour
 * never touches them); CAT_SHADES puts them on every pose of a skin. */
function catSkin(fn: (frame: Frame, h: HeadSpec) => Frame, lenses: boolean): Record<CatPose, Sprite> {
  const out = {} as Record<CatPose, Sprite>;
  for (const [pose, { ms, loop = true, mirror = false, frames }] of Object.entries(CAT_POSES) as [CatPose, PoseDef][]) {
    out[pose] = toSprite(
      anim(
        ms,
        frames.map(({ frame, head: h }) => {
          const skinned = fn(frame, h);
          const done = outline(lenses || pose === "shades" ? catLenses(skinned, h) : skinned);
          return mirror ? done.map((row) => [...row].reverse().join("")) : done;
        }),
        loop,
      ),
    );
  }
  return out;
}

const bySkin = (lenses: boolean) =>
  Object.fromEntries(Object.entries(CAT_SKINS).map(([skin, fn]) => [skin, catSkin(fn, lenses)])) as Record<SkinName, Record<CatPose, Sprite>>;

export const CAT = bySkin(false);
export const CAT_SHADES = bySkin(true);
