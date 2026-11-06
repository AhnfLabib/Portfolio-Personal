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
