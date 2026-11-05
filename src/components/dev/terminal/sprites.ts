import type { SkinName } from "./commands";

/** char → CSS colour token. "." is transparent and never appears here. */
export type Palette = Record<string, string>;
/** Each frame is `h` strings of `w` chars. */
export interface Sprite {
  w: number;
  h: number;
  frames: string[][];
}
export type AhnafPose = "idle" | "blink" | "typing" | "thinking" | "happy" | "confused" | "shades";
export type CatPose = "sleep" | "awake" | "stretch" | "walk1" | "walk2" | "purr" | "shades";

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
 * stamp: paint a small layer onto a frame at (top, left); "_" in the layer
 *        keeps the pixel underneath, any other char (including ".") replaces it.
 * recolor: swap chars everywhere (simultaneous, so { s: "#", "#": "a" } works).
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

function withStamp(frame: Frame, [layer, top, left]: Stamp): Frame {
  return stamp(frame, layer, top, left);
}

function recolor(frame: Frame, map: Record<string, string>): Frame {
  return frame.map((row) => row.replace(/./g, (c) => map[c] ?? c));
}

function sprite(...frames: Frame[]): Sprite {
  return { w: frames[0][0].length, h: frames[0].length, frames };
}

function mapPoses<P extends string>(poses: Record<P, Frame>, fn: (frame: Frame, pose: P) => Frame): Record<P, Sprite> {
  const out = {} as Record<P, Sprite>;
  for (const pose of Object.keys(poses) as P[]) out[pose] = sprite(fn(poses[pose], pose));
  return out;
}

/* ── Ahnaf: 18×24 bust ─────────────────────────────────────────────────────
 * # ink (hair, frames, goatee)  f ink-faint (skin)  b bg (lenses)
 * s ink-soft (shirt, mouth)     a accent (details)
 */
const AHNAF_BASE: Frame = [
  "..................",
  "..................",
  "......######......",
  "....##########....",
  "...############...",
  "...#############..",
  "...##fff#########.",
  "...#fffff#######..",
  "...#ffffffff###...",
  "...#f##ffff##f#...",
  "..ff#bb####bb#ff..",
  "..ff#b##ff#b##ff..",
  "...ff##ffff##ff...",
  "...ffffffffffff...",
  "...ffffsffsffff...",
  "....ffffssffff....",
  ".....fff##fff.....",
  "......ff##ff......",
  ".......ffff.......",
  "....sssffffsss....",
  "..ssssssffssssss..",
  ".ssssssssssssssss.",
  ".ssssssssssssssss.",
  ".ssssssssssssssss.",
];

/* Pose layers, stamped onto the base. Eyes cover the 2×2 lens interiors
 * (rows 10–11, cols 5–12; "_" keeps the frames and bridge), the mouth covers
 * rows 14–15, cols 4–13. */
const EYES = (top: string, bottom: string): Stamp => [[top, bottom], 10, 5];
const MOUTH = (top: string, bottom: string): Stamp => [[top, bottom], 14, 4];

const SHADES_EYES = EYES("##____##", "##____##");
const QUESTION_MARK: Stamp = [["aa.", "..a", ".a.", "...", ".a."], 0, 15];
const THOUGHT_DOTS: Stamp = [["..a", "...", ".a."], 0, 15];
const BLUSH: Stamp = [["a________a"], 13, 4];
const HAND_ON_CHIN: Stamp = [["ff#", "ff#", "##_", "#__"], 17, 10];
const LAPTOP: Stamp = [
  [
    "f##########f",
    "f####aa####f",
    "_##########_",
    "_##########_",
  ],
  20,
  3,
];

function ahnafPose(...stamps: Stamp[]): Frame {
  return stamps.reduce(withStamp, AHNAF_BASE);
}

const AHNAF_POSES: Record<AhnafPose, Frame> = {
  idle: AHNAF_BASE,
  blink: ahnafPose(EYES("bb____bb", "##____##")),
  typing: ahnafPose(EYES("bb____bb", "b#____#b"), MOUTH("ffffffffff", "ffffssffff"), LAPTOP),
  thinking: ahnafPose(EYES("b#____b#", "bb____bb"), MOUTH("ffffffffff", "ffffsssfff"), HAND_ON_CHIN, THOUGHT_DOTS),
  happy: ahnafPose(EYES("##____##", "bb____bb"), MOUTH("ffsffffsff", "fffssssfff"), BLUSH),
  confused: ahnafPose(EYES("#b____bb", "bb____b#"), MOUTH("fffsfsffff", "ffffsfsfff"), QUESTION_MARK),
  shades: ahnafPose(SHADES_EYES, MOUTH("ffffffsfff", "fffffssfff")),
};

/* Skin layers, stamped onto every pose (the head never moves between poses). */
const HOOD: Stamp = [
  [
    "_____ssssssss_____",
    "___ssssssssssss___",
    "__ssssssssssssss__",
    "__ss__________ss__",
    "_sss__________sss_",
    "_ss____________ss.",
    "_ss____________ss_",
    "_ss____________ss_",
    "_ss____________ss_",
    "_ss____________ss_",
    "_ss____________ss_",
    "_ss____________ss_",
    "_ss____________ss_",
    "_sss__________sss_",
    "_ssss________ssss_",
    "_sssss______sssss_",
    "_ssssss____ssssss_",
    "_sssss______sssss_",
  ],
  1,
  0,
];
const BERET: Stamp = [
  [
    "______a___",
    "___aaaaaa_",
    "_aaaaaaaaaa",
    "aaaa______",
  ],
  0,
  2,
];

/* ── Cat: 16×16, faces left, sits on row 12; the tail hangs below it ────── */
const CAT_AWAKE: Frame = [
  "................",
  "................",
  "................",
  ".s.....s........",
  ".ss...ss........",
  ".sssssss........",
  ".ss#s#ss........",
  ".sssfsss........",
  "..sssss.........",
  "..ssssssssss....",
  "..sssssssssss...",
  "..ssssssssssss..",
  "..sfsfsssssssss.",
  ".............ss.",
  "..............s.",
  ".............ss.",
];

const CAT_SLEEP: Frame = [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  ".s....s.........",
  ".ss..ss.........",
  ".sssssssssss....",
  ".s##s##ssssss...",
  "..ssssssssssss..",
  ".............ss.",
  "..............s.",
];

const CAT_STRETCH: Frame = [
  "................",
  "................",
  "................",
  "...............s",
  "..............s.",
  "..............s.",
  "...........ssss.",
  "..........sssss.",
  ".s..s....ssssss.",
  ".ssss...sssssss.",
  "s#s#s.sssssss.s.",
  "ssssssss......s.",
  "fsfss.........s.",
  "................",
  "................",
  "................",
];

const CAT_WALK1: Frame = [
  "................",
  "................",
  "................",
  "..............s.",
  ".s..s.........s.",
  ".ssss........s..",
  "s#sss........s..",
  "ssssssssssssss..",
  ".sssssssssssss..",
  "..ssssssssssss..",
  "..s..s....s..s..",
  ".s....s..s....s.",
  ".s....s..s....s.",
  "................",
  "................",
  "................",
];

const CAT_POSES: Record<CatPose, Frame> = {
  sleep: CAT_SLEEP,
  awake: CAT_AWAKE,
  stretch: CAT_STRETCH,
  walk1: CAT_WALK1,
  walk2: stamp(CAT_WALK1, ["...ss....ss.....", "...ss....ss.....", "...ss....ss....."], 10, 0),
  // eyes squeezed shut, a small accent heart floating over the back
  purr: stamp(stamp(CAT_AWAKE, ["s##s##s"], 6, 1), ["a.a", ".a."], 1, 9),
  shades: CAT_AWAKE,
};

/** Where each cat pose keeps its eyes (for lenses) and mouth (for the brush). */
const CAT_FACE: Record<CatPose, { lenses: Stamp; mouth: [row: number, col: number] }> = {
  sleep: { lenses: [["#####"], 12, 2], mouth: [12, 0] },
  awake: { lenses: [["#####"], 6, 2], mouth: [8, 1] },
  stretch: { lenses: [["#####"], 10, 0], mouth: [13, 1] },
  walk1: { lenses: [["###"], 6, 1], mouth: [8, 0] },
  walk2: { lenses: [["###"], 6, 1], mouth: [8, 0] },
  purr: { lenses: [["#####"], 6, 2], mouth: [8, 1] },
  shades: { lenses: [["#####"], 6, 2], mouth: [8, 1] },
};

const catLenses = (frame: Frame, pose: CatPose): Frame => withStamp(frame, CAT_FACE[pose].lenses);
const catBrush = (frame: Frame, pose: CatPose): Frame => {
  const [row, col] = CAT_FACE[pose].mouth;
  return stamp(frame, ["a"], row, col);
};

/* The `shades` pose always wears lenses (stamped after the skin, so a recolour
 * never touches them); the shades skin puts them on every pose. */
const catPoses = (fn: (frame: Frame, pose: CatPose) => Frame) =>
  mapPoses(CAT_POSES, (frame, pose) => (pose === "shades" ? catLenses(fn(frame, pose), pose) : fn(frame, pose)));

export const AHNAF: Record<SkinName, Record<AhnafPose, Sprite>> = {
  default: mapPoses(AHNAF_POSES, (f) => f),
  hacker: mapPoses(AHNAF_POSES, (f) => withStamp(f, HOOD)),
  artist: mapPoses(AHNAF_POSES, (f) => withStamp(f, BERET)),
  shades: mapPoses(AHNAF_POSES, (f) => withStamp(f, SHADES_EYES)),
};

export const CAT: Record<SkinName, Record<CatPose, Sprite>> = {
  default: catPoses((f) => f),
  hacker: catPoses((f) => recolor(f, { s: "#", f: "#", "#": "a" })),
  artist: catPoses(catBrush),
  shades: catPoses(catLenses),
};
