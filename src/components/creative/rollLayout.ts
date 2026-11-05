/** "R2 · 03" — 1-based roll, 1-based zero-padded frame. */
export function frameLabel(rollIndex: number, frameIndex: number): string {
  return `R${rollIndex + 1} · ${String(frameIndex + 1).padStart(2, "0")}`;
}
