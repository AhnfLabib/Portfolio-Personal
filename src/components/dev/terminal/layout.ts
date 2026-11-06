/**
 * Where the cat sits, in px relative to the card's top-left corner.
 * Pure geometry shared by the component and its tests.
 *
 * The cat's top track runs along the whole title bar, from the card's 16 px
 * padding to the right-hand corner; from there it hops down the right edge (a
 * column straddling the border) to the bottom edge, which runs the card's full
 * width.
 */
import { CAT } from "./sprites";
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

export const CAT_H = 40; // h-10
export const CAT_W = (CAT.default.sit.w / CAT.default.sit.h) * CAT_H;
/** On the bottom edge the cat's clear top rows tuck into the log's bottom padding. */
export const BOTTOM_TUCK = 8;

/** Left end of the cat's top track: in line with the card's 16 px padding. */
export const TOP_START = 16;
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
