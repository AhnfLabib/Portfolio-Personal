/**
 * Where the companions sit, in px relative to the card's top-left corner.
 * Pure geometry shared by the component and its tests.
 *
 * Ahnaf stands at the LEFT end of the title bar (above the three dots, in line
 * with the card's 16 px padding), 40 px above the card and overlapping the
 * title bar by 8 px. The cat's top track starts 8 px to his right and runs to
 * the right-hand corner; from there it hops down the right edge (a column
 * straddling the border) to the bottom edge, which runs the card's full width.
 */
import { AHNAF, CAT } from "./sprites";
import type { WanderBounds, WanderState } from "./wander";

export interface Size {
  w: number;
  h: number;
}
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const AHNAF_H = 48; // h-12
export const AHNAF_W = (AHNAF.default.idle.w / AHNAF.default.idle.h) * AHNAF_H;
export const AHNAF_LEFT = 16; // left-4
export const AHNAF_OVERLAP = 8; // translate-y-2: he stands 8 px into the title bar
export const CAT_H = 32; // h-8
export const CAT_W = (CAT.default.sit.w / CAT.default.sit.h) * CAT_H;
/** Clearance between Ahnaf and the start of the cat's top track. */
export const GAP = 8;
/** On the bottom edge the cat's clear top rows tuck into the log's bottom padding. */
export const BOTTOM_TUCK = 8;

export const ahnafBox = (): Box => ({ x: AHNAF_LEFT, y: -(AHNAF_H - AHNAF_OVERLAP), w: AHNAF_W, h: AHNAF_H });

/** Left end of the cat's top track: just right of Ahnaf. */
export const TOP_START = AHNAF_LEFT + AHNAF_W + GAP;
/** The right-hand corners line up with the right edge's column, so hops go straight down and up. */
export const cornerX = (w: number) => Math.max(TOP_START, w - CAT_W / 2);

export const boundsOf = ({ w, h }: Size): WanderBounds => ({
  topWidth: cornerX(w) - TOP_START,
  rightHeight: h + CAT_H - BOTTOM_TUCK,
  bottomWidth: cornerX(w),
});

/** The cat's box for a point along an edge (see wander.ts for the tracks). */
export function catBox(s: Pick<WanderState, "edge" | "x">, size: Size): Box {
  const b = boundsOf(size);
  const clamp = (v: number, hi: number) => Math.min(Math.max(v, 0), hi);
  const [x, y] =
    s.edge === "top"
      ? [TOP_START + clamp(s.x, b.topWidth), -CAT_H]
      : s.edge === "bottom"
        ? [clamp(s.x, b.bottomWidth), size.h - BOTTOM_TUCK]
        : [cornerX(size.w), -CAT_H + clamp(s.x, b.rightHeight)];
  return { x, y, w: CAT_W, h: CAT_H };
}

export const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
