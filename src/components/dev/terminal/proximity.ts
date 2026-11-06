/**
 * How close the cursor is to the cat. Pure: points and boxes in the same
 * (viewport) coordinates, as pointer events and getBoundingClientRect give them.
 */
export interface Point {
  x: number;
  y: number;
}
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export type Zone = "far" | "near" | "close";

export const NEAR_PX = 120;
export const CLOSE_PX = 40;

/** Distance from the point to the box's nearest edge; 0 inside the box. */
export function distanceTo(p: Point, b: Rect): number {
  const dx = Math.max(b.x - p.x, 0, p.x - (b.x + b.w));
  const dy = Math.max(b.y - p.y, 0, p.y - (b.y + b.h));
  return Math.hypot(dx, dy);
}

export function zoneFor(cursor: Point, box: Rect): Zone {
  const d = distanceTo(cursor, box);
  return d < CLOSE_PX ? "close" : d < NEAR_PX ? "near" : "far";
}

/** Which way to face to look at the cursor: -1 when it is left of the box's centre. */
export function facingFor(cursor: Point, box: Rect): -1 | 1 {
  return cursor.x < box.x + box.w / 2 ? -1 : 1;
}
