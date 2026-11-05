import type { Frame } from "../../data/content";

export type Columns = 1 | 2 | 3;

/** Grid columns for a viewport width: 3 at ≥1024, 2 at ≥640, else 1. */
export function columnsFor(width: number): Columns {
  if (width >= 1024) return 3;
  if (width >= 640) return 2;
  return 1;
}

/**
 * Grid span for a frame. Portrait frames span 2 rows (except in a single
 * column); the first frame of a roll spans 2 columns at 3 columns.
 */
export function spanFor(
  frame: Pick<Frame, "width" | "height">,
  index: number,
  columns: Columns,
): { col: 1 | 2; row: 1 | 2 } {
  if (columns === 1) return { col: 1, row: 1 };
  return {
    col: index === 0 && columns === 3 ? 2 : 1,
    row: frame.height > frame.width ? 2 : 1,
  };
}

/** "R2 · 03" — 1-based roll, 1-based zero-padded frame. */
export function frameLabel(rollIndex: number, frameIndex: number): string {
  return `R${rollIndex + 1} · ${String(frameIndex + 1).padStart(2, "0")}`;
}
