export type PlayerState = { playing: number | null };

export type PlayerAction = { type: "play"; index: number } | { type: "pause" } | { type: "ended" };

/** One draft plays at a time: `play` switches to that row, `pause`/`ended` clear. */
export function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case "play":
      return state.playing === action.index ? state : { playing: action.index };
    case "pause":
    case "ended":
      return state.playing === null ? state : { playing: null };
  }
}

/** Seconds → `m:ss`, floored. Invalid or negative input reads `0:00`. */
export function formatTime(seconds: number): string {
  const total = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
