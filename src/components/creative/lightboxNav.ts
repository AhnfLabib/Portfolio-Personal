import type { Frame, Roll } from "../../data/content";

export interface Pos {
  roll: number;
  frame: number;
}

/** One step through the rolls in reading order; crosses roll ends, clamps at the very first/last frame. */
export function nextIndex(rolls: Roll[], pos: Pos, dir: 1 | -1): Pos {
  const frame = pos.frame + dir;
  if (frame >= 0 && frame < rolls[pos.roll].frames.length) return { roll: pos.roll, frame };
  // Skip empty rolls, if any, when crossing.
  for (let r = pos.roll + dir; r >= 0 && r < rolls.length; r += dir) {
    const n = rolls[r].frames.length;
    if (n > 0) return { roll: r, frame: dir === 1 ? 0 : n - 1 };
  }
  return pos;
}

function sameFrame(a: Pos, b: Pos): boolean {
  return a.roll === b.roll && a.frame === b.frame;
}

/** The frames either side of `pos` in reading order (undefined past the ends). */
export function flatNeighbours(rolls: Roll[], pos: Pos): { prev?: Frame; next?: Frame } {
  const p = nextIndex(rolls, pos, -1);
  const n = nextIndex(rolls, pos, 1);
  return {
    prev: sameFrame(p, pos) ? undefined : rolls[p.roll].frames[p.frame],
    next: sameFrame(n, pos) ? undefined : rolls[n.roll].frames[n.frame],
  };
}
