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
export type AhnafPose = "idle" | "blink" | "turn" | "typing" | "thinking" | "happy" | "confused" | "shades";
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
  | "shades";

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

const anim = (ms: number, frames: Frame[], loop = true) => ({ ms, frames, loop });
const still = (frame: Frame) => anim(0, [frame]);
type Anim = ReturnType<typeof anim>;

function toSprite({ ms, frames, loop }: Anim): Sprite {
  return { w: frames[0][0].length, h: frames[0].length, frames, ms: frames.length > 1 ? ms : 0, loop };
}

function mapPoses<P extends string>(poses: Record<P, Anim>, fn: (frame: Frame, pose: P, i: number) => Frame): Record<P, Sprite> {
  const out = {} as Record<P, Sprite>;
  for (const pose of Object.keys(poses) as P[]) {
    const a = poses[pose];
    out[pose] = toSprite({ ...a, frames: a.frames.map((f, i) => fn(f, pose, i)) });
  }
  return out;
}

/* ── Ahnaf: 32×32 headshot, 1.5 px per pixel (48 px tall) ──────────────────
 * f ink-faint: hair, brows, goatee, hoodie   s ink-soft: skin, drawstrings
 * # ink: glasses, the shine on the swoop     b bg: pupils, mouth, hood shadow
 * a accent: the drawstring tips
 */
const AHNAF_BASE: Frame = [
  "................................",
  "............ffffffff............",
  ".........ffffffffffffff.........",
  "........ffff####fffffffff.......",
  ".......ffffffff####fffffff......",
  ".......fffffffffff####fffff.....",
  ".......ffffffffffffff###ffff....",
  ".......fffsssffffffffffffff.....",
  ".......ffsssssssffffffffff......",
  "........fsssssssssfffffff.......",
  "........fssssssssssssfff........",
  "........fsffffssssffffsf........",
  "........ss####ssss####ss........",
  "........##ssss####ssss##........",
  "........f#sbbs#ss#sbbs#f........",
  "........s#sbbs#ss#sbbs#s........",
  "........ss####ssss####ss........",
  ".........ssssssffssssss.........",
  ".........ssssffffffssss.........",
  "..........ssssbbbbssss..........",
  "...........sssffffsss...........",
  "............ssffffss............",
  ".............ssffss.............",
  ".............ssssss.............",
  ".........ffbbssssssbbff.........",
  "......ffffffbbssssbbffffff......",
  "....ffffffffsbbbbbbsffffffff....",
  "...fffffffffsfbbbbfsfffffffff...",
  "...fffffffffsffbbffsfffffffff...",
  "...fffffffffsffffffsfffffffff...",
  "...fffffffffaffffffafffffffff...",
  "...ffffffffffffffffffffffffff...",
];

/* Face layers. EYES covers both lens interiors (rows 13–15; cols 10–13 and
 * 18–21; the bridge between them is kept), MOUTH rows 18–19, cols 13–18. */
type Eye = [string, string, string];
const EYES = (l: Eye, r: Eye = l): Stamp => [[0, 1, 2].map((i) => `${l[i]}____${r[i]}`), 13, 10];
const MOUTH = (bottom: string, top = "ffffff"): Stamp => [[top, bottom], 18, 13];

const OPEN: Eye = ["ssss", "sbbs", "sbbs"];
const CLOSED: Eye = ["ssss", "ssss", "bbbb"];
const TO_PROMPT: Eye = ["ssss", "bbss", "bbss"]; // down-left, where the prompt is
const SIDEWAYS: Eye = ["ssss", "ssbb", "ssbb"];
const UP: Eye = ["ssbb", "ssbb", "ssss"];
const GLAD: Eye = ["ssss", "sbbs", "bssb"];
const DARK_LENSES: Eye = ["b#bb", "bbbb", "bbbb"];
const SHADES_EYES = EYES(DARK_LENSES);

const BLUSH: Stamp = [part("a..........a"), 17, 10];
const QUESTION = (top: number): Stamp => [part(".aaa.", "a...a", "...a.", "..a..", ".....", "..a.."), top, 26];
const DOTS: Stamp[] = [
  [["a"], 3, 24],
  [["aa", "aa"], 1, 26],
  [["aaa", "aaa"], 0, 29],
];
const HAND_ON_CHIN: Stamp = [part(".bbbb.", "bssssb", "bssssb", "bssssb", ".bssb.", ".bffb."), 19, 18];
const LAPTOP: Stamp = [
  part(
    "bbbbbbbbbbbbbbbbbb",
    "bssssssssssssssssb",
    "bssssssssaassssssb",
    "bssssssssssssssssb",
    "bssssssssssssssssb",
  ),
  27,
  7,
];
const HANDS = (leftUp: boolean): Stamp[] => [
  [part("sss", "sss"), leftUp ? 25 : 26, 9],
  [part("sss", "sss"), leftUp ? 26 : 25, 20],
];

const face = (...layers: Stamp[]) => stamps(AHNAF_BASE, ...layers);
/** Head and neck (rows 0–23) turned a pixel to the side. */
const turned = (frame: Frame) => shift(frame, 0, 24, 1);
/** The top of the head tipped sideways: a pixel at rows 0–10. */
const tilted = (frame: Frame) => shift(frame, 0, 11, 1);
const breathing = (frame: Frame) => anim(1200, [frame, lower(frame)]);

const AHNAF_POSES: Record<AhnafPose, Anim> = {
  idle: breathing(face(EYES(OPEN))),
  blink: still(face(EYES(CLOSED))),
  turn: breathing(turned(face(EYES(SIDEWAYS)))),
  // eyes on the prompt, hands busy on the laptop
  typing: anim(180, [true, false].map((leftUp) => face(EYES(TO_PROMPT), MOUTH("ssbbss"), LAPTOP, ...HANDS(leftUp)))),
  // looks up while the thought dots fill in, one by one
  thinking: anim(
    400,
    [1, 2, 3].map((n) => face(EYES(UP), MOUTH("sssbbs"), HAND_ON_CHIN, ...DOTS.slice(0, n))),
  ),
  // a grin and a little bounce
  happy: (() => {
    const glad = face(EYES(GLAD), MOUTH("bbbbbb"), BLUSH);
    return anim(250, [glad, lift(glad)]);
  })(),
  confused: anim(
    500,
    [1, 0].map((top) => stamps(tilted(face(EYES(["sbbs", "sbbs", "ssss"], ["ssss", "sbbs", "sbbs"]), MOUTH("ssbbss"))), QUESTION(top))),
  ),
  shades: breathing(face(SHADES_EYES, MOUTH("ssbbbb"))),
};

/* Skins, stamped onto every frame (the swoop and face stay put between poses). */
const HOOD: Stamp = (() => {
  // the hood up: a 2-px band hugging the head (rows 1–23), closed over the crown
  const rows = AHNAF_BASE.map((row, y) => {
    if (y > 23) return "_".repeat(row.length);
    const src = AHNAF_BASE[Math.max(1, y)];
    const l = src.search(/[^.]/);
    const r = src.length - 1 - [...src].reverse().join("").search(/[^.]/);
    return [...row]
      .map((c, x) => {
        if (y === 0) return x >= l - 1 && x <= r + 1 ? "f" : "_";
        if (x === l - 1 || x === l - 2 || x === r + 1 || x === r + 2) return "f";
        return c === "#" && y < 8 ? "f" : "_"; // no shine under the hood
      })
      .join("");
  });
  return [rows, 0, 0];
})();
const BERET: Stamp = [part("........aa.......", "....aaaaaaaaa....", "..aaaaaaaaaaaaa..", ".aaaaaaaaaaaaaaa.", "aaaa............."), 0, 6];

const ahnafSkin = (fn: (frame: Frame) => Frame) => mapPoses(AHNAF_POSES, (frame) => fn(frame));

export const AHNAF: Record<SkinName, Record<AhnafPose, Sprite>> = {
  default: ahnafSkin((f) => f),
  hacker: ahnafSkin((f) => withStamp(f, HOOD)),
  artist: ahnafSkin((f) => withStamp(f, BERET)),
  shades: ahnafSkin((f) => withStamp(f, SHADES_EYES)),
};

/* ── Cat: 24×24, faces right, 1.33 px per pixel (32 px tall) ──────────────
 * f ink-faint: fur   s ink-soft: belly, muzzle, inner ears, socks
 * # ink: nose        a accent: eyes (and hearts, z's)      b bg: dark gaps
 * Every frame is a body with one of two heads stamped where the pose holds it.
 */
const HEAD_FRONT: Frame = part(
  "f........f",
  "ff......ff",
  "fsf....fsf",
  "ffffffffff",
  "ffaffffaff",
  "ffaffffaff",
  "fffs##sfff",
  ".ffssssff.",
  "..ffssff..",
);
const HEAD_SIDE: Frame = part(
  ".f....f...",
  ".ff..fff..",
  ".fffffsf..",
  "fffffffff.",
  "ffffffaff.",
  "ffffffafff",
  "ffffffffs#",
  ".fffffssss",
  "..ffffss..",
);
type HeadKind = "front" | "side";
const HEADS: Record<HeadKind, Frame> = { front: HEAD_FRONT, side: HEAD_SIDE };
/** Head layers, relative to the head's top-left. */
const HEAD_FACE: Record<HeadKind, { eyes: [number, number][]; lenses: Stamp; beret: Stamp; mouth: [number, number] }> = {
  front: { eyes: [[4, 2], [4, 7]], lenses: [["##########", "_###__###_"], 4, 0], beret: [part("..a..", ".aaa.", "aaaaa"), 0, 3], mouth: [7, 4] },
  side: { eyes: [[4, 6]], lenses: [["_######", "____###"], 4, 3], beret: [part("..a..", ".aaa.", "aaaaa"), 0, 1], mouth: [7, 7] },
};
type HeadSpec = { kind: HeadKind; row: number; col: number; eyes?: "open" | "shut" | "glad"; mouth?: Frame };

function head({ kind, row, col, eyes = "open", mouth }: HeadSpec): Stamp[] {
  const out: Stamp[] = [[HEADS[kind], row, col]];
  for (const [r, c] of HEAD_FACE[kind].eyes) {
    if (eyes === "shut") out.push([["f", "a"], row + r, col + c]);
    if (eyes === "glad") out.push([["f", "a"], row + r, col + c], [["a"], row + r, col + c + (kind === "front" && c > 4 ? 1 : -1)]);
  }
  if (mouth) out.push([mouth, row + HEAD_FACE[kind].mouth[0], col + HEAD_FACE[kind].mouth[1] - 1]);
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
  ".............fffffff....",
  "...........ffffssssff...",
  ".........ffffffsssssf...",
  "........fffffffsssssf...",
  ".......fffffffffssssf...",
  ".......fffffffffssssf...",
  "......ffffffffffssssf...",
  "......ffffffffbffbfff...",
  "......ffffffffbffbfff...",
  "......ffffffffbffbffff..",
  "......ffffffffbffbffff..",
  ".......ffffffffssbssff..",
];
const SIT_HEAD: HeadSpec = { kind: "front", row: 4, col: 11 };
const TAIL_DOWN: Stamp = [part("......", ".f.....", "f......", "f......", ".ffffff"), 19, 0];
const TAIL_SWAY: Stamp = [part("f......", ".f.....", ".f.....", "f......", ".ffffff"), 19, 0];
const TAIL_HIGH: Stamp = [part("ff......", "..f.....", "..f.....", "..f.....", "...f....", "...ff...", "....fff."), 11, 0];
const TAIL_HOOK: Stamp = [part(".ff.....", "f.......", "f.......", ".f......", "..f.....", "...ff...", "....fff."), 11, 0];
/** The right ear flicks down: its tip goes, the inner ear shows lower. */
const EAR_TWITCH: Stamp = [["_________.", "_______fsf"], 4, 11];
const ZZ = (n: number): Stamp => [n ? part("aaa...", ".a....", "aaa.aa", "......", "....a.") : part("......", "aa....", "a.....", "aa....", "......"), 6, 16];

const sitFrame = (tail: Stamp, h: Partial<HeadSpec> = {}, ...extra: Stamp[]) =>
  catFrame(stamps(SIT_BODY, tail), { ...SIT_HEAD, ...h }, ...extra);

/* Standing / walking: a long body (rows 11–17); legs, tail and head stamped. */
const WALK_BODY: Frame = [
  ...blank(24, 11),
  "....fffffffffffff.......",
  "...fffffffffffffff......",
  "..ffffffffffffffff......",
  "..ffffffffffffffff......",
  "..ffffffffffffffff......",
  "...fffsssssssssff.......",
  "....ffssssssssff........",
  ...blank(24, 6),
];
/** A leg from `top` to the ground: 3 rows at `col`, the rest at `col + dx`, a sock at the bottom. */
function leg(col: number, dx: number, top = 18, bottom = 23): Stamp {
  const n = bottom - top + 1;
  return [Array.from({ length: n }, (_, i) => "_".repeat(i < 3 ? col : col + dx) + (i === n - 1 ? "ss" : "ff")), top, 0];
}
const TAIL_UP_A: Stamp = [part("f...", "ff..", ".f..", ".f..", ".ff.", "..f.", "..ff"), 5, 0];
const TAIL_UP_B: Stamp = [part(".f..", "ff..", "f...", "f...", "ff..", ".ff.", "..ff"), 5, 0];

const walkFrame = (legs: [number, number][], tail: Stamp, bob: 0 | 1, headKind: HeadKind = "side") => {
  const body = bob ? lower(WALK_BODY) : WALK_BODY;
  return catFrame(stamps(body, tail, ...legs.map(([c, dx]) => leg(c, dx))), { kind: headKind, row: 5 + bob, col: 14 });
};

/* Stretch: rump up and front paws reaching forward along the ground. */
const STRETCH_BODY: Frame = [
  ...blank(24, 9),
  "..ffffff................",
  "..fffffffff.............",
  "..ffffffffffff..........",
  "..ffffffffffffffff......",
  "..ffffsssssssfffff......",
  "..ff.ff..sssssffff......",
  "..ff.ff.....fffffff.....",
  "..ff.ff.......ffffff....",
  "..ff.ff.................",
  "..ff.ff.................",
  "..ff.ff.................",
  "..ff.ff.................",
  "..ff.ff.....ffffffffff..",
  "..ss.ss.....ffffffffss..",
  ...blank(24, 1),
].slice(0, 24);
const TAIL_STRETCH_A: Stamp = [part("f...", "f...", "ff..", ".f.."), 5, 2];
const TAIL_STRETCH_B: Stamp = [part("..f.", ".f..", "ff..", ".f.."), 5, 2];

/* Sleeping: a loaf, head down on the paws; it breathes. */
const SLEEP_BODY: Frame = [
  ...blank(24, 13),
  ".....ffffffffff.........",
  "...ffffffffffffff.......",
  "..ffffffffffffffff......",
  ".ffffffffffffffffff.....",
  ".ffffffffffffffffff.....",
  ".ffffffffffffffffff.....",
  ".ffffffffffffffffff.....",
  ".ffffffffffffffffff.....",
  ".ffffffffffffffffff.....",
  "..ffffffffffffffffffff..",
  "...sss..........ss......",
];
const SLEEP_HEAD: HeadSpec = { kind: "front", row: 14, col: 13, eyes: "shut" };
const HEART = (top: number, left: number): Stamp => [part(".a.a.", "aaaaa", ".aaa.", "..a.."), top, left];
const SMALL_HEART = (top: number, left: number): Stamp => [part("a.a", ".a."), top, left];
const PAW = (row: number): Stamp => [["ss", "ss"], row, 20];
const NO_RIGHT_LEG: Stamp = [Array.from({ length: 5 }, () => ".."), 19, 18];

const CAT_POSES: Record<CatPose, { ms: number; loop?: boolean; frames: CatFrame[] }> = {
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
      catFrame(stamps(shift(STRETCH_BODY, 21, 23, 1), TAIL_STRETCH_B), { kind: "front", row: 13, col: 14, eyes: "shut" }),
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
      catFrame(SLEEP_BODY, SLEEP_HEAD, ZZ(0)),
      catFrame(stamps(SLEEP_BODY, [part(".....ffffffffff."), 12, 0], [part("...fffffffffffffff"), 13, 0]), SLEEP_HEAD, ZZ(1)),
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
      catFrame(stamps(lower(WALK_BODY, 3), TAIL_UP_B, leg(3, 1, 21), leg(6, 1, 21), leg(13, 1, 21), leg(15, 1, 21)), { kind: "side", row: 9, col: 14 }),
      catFrame(
        stamps(lift(WALK_BODY, 2), [part("ff....", ".fff..", "...fff"), 8, 0], leg(3, -2, 16, 20), leg(6, -2, 16, 20), leg(13, 2, 16, 20), leg(15, 2, 16, 20)),
        { kind: "side", row: 3, col: 14 },
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
  for (const [pose, { ms, loop = true, frames }] of Object.entries(CAT_POSES) as [CatPose, (typeof CAT_POSES)[CatPose]][]) {
    out[pose] = toSprite(
      anim(
        ms,
        frames.map(({ frame, head: h }) => {
          const skinned = fn(frame, h);
          return lenses || pose === "shades" ? catLenses(skinned, h) : skinned;
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
