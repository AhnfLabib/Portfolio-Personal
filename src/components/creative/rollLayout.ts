export type Columns = 1 | 2 | 3;

/** Contact-sheet columns for a viewport width: 3 at ≥1024, 2 at ≥640, else 1. */
export function columnsFor(width: number): Columns {
  if (width >= 1024) return 3;
  if (width >= 640) return 2;
  return 1;
}

/** "R2 · 03" — 1-based roll, 1-based zero-padded frame. */
export function frameLabel(rollIndex: number, frameIndex: number): string {
  return `R${rollIndex + 1} · ${String(frameIndex + 1).padStart(2, "0")}`;
}
