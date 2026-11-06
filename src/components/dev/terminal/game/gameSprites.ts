import type { ObstacleKind } from "./engine";

/* Cat Dash obstacle grids. Same conventions as ../sprites.ts: equal-length
 * rows, "." transparent, other chars are PALETTE keys. */

/** A cardboard box, 14×12: faint fill, soft edges and tape. */
export const BOX: string[] = [
  "ssssssssssssss",
  "sffffssssffffs",
  "sffffsffsffffs",
  "sfffffssfffffs",
  "ssssssssssssss",
  "sffffffffffffs",
  "sffffffffffffs",
  "sfffssssssfffs",
  "sffffffffffffs",
  "sffffffffffffs",
  "sffffffffffffs",
  "ssssssssssssss",
];

/** A cucumber lying on its side, 18×8: accent body, soft speckles and ends. */
export const CUCUMBER: string[] = [
  "..................",
  "....aaaaaaaaaaa...",
  "..aaasaaaaasaaaaa.",
  ".saaaaaasaaaaasaas",
  ".aaasaaaaaasaaaaas",
  "..aaaaasaaaaaaaa..",
  "....aaaaaaaaaaa...",
  "..................",
];

/** One tile of the scrolling ground texture, repeated along the floor. */
export const GROUND_DASH: string[] = [
  "ffff....ff......",
  "......f.....f...",
];

export const OBSTACLE_SIZE: Record<ObstacleKind, { w: number; h: number }> = {
  box: { w: BOX[0].length, h: BOX.length },
  cucumber: { w: CUCUMBER[0].length, h: CUCUMBER.length },
};

/** 3×5 pixel digits for the score (drawn at 2×, in one colour; "#" lit, "." clear). */
export const DIGITS: Record<string, string[]> = {
  "0": ["###", "#.#", "#.#", "#.#", "###"],
  "1": [".#.", "##.", ".#.", ".#.", "###"],
  "2": ["###", "..#", "###", "#..", "###"],
  "3": ["###", "..#", ".##", "..#", "###"],
  "4": ["#.#", "#.#", "###", "..#", "..#"],
  "5": ["###", "#..", "###", "..#", "###"],
  "6": ["###", "#..", "###", "#.#", "###"],
  "7": ["###", "..#", ".#.", ".#.", ".#."],
  "8": ["###", "#.#", "###", "#.#", "###"],
  "9": ["###", "#.#", "###", "..#", "###"],
};

/** Ten fixed faint stars, [x, y] in world px (y 10–60, clear of the score in the top-right). */
export const STARS: readonly (readonly [number, number])[] = [
  [14, 22],
  [37, 48],
  [58, 15],
  [83, 37],
  [104, 57],
  [127, 19],
  [149, 44],
  [171, 28],
  [196, 53],
  [222, 34],
];
