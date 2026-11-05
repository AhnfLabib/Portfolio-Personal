import { describe, it, expect } from "vitest";
import { formatTime, playerReducer } from "./player";

describe("playerReducer", () => {
  it("play switches, pause/ended clear", () => {
    expect(playerReducer({ playing: null }, { type: "play", index: 0 })).toEqual({ playing: 0 });
    expect(playerReducer({ playing: 0 }, { type: "play", index: 1 })).toEqual({ playing: 1 });
    expect(playerReducer({ playing: 1 }, { type: "pause" })).toEqual({ playing: null });
    expect(playerReducer({ playing: 1 }, { type: "ended" })).toEqual({ playing: null });
  });
});

describe("formatTime", () => {
  it("formats m:ss, flooring", () => {
    expect(formatTime(44)).toBe("0:44");
    expect(formatTime(65.4)).toBe("1:05");
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(59.99)).toBe("0:59");
    expect(formatTime(600)).toBe("10:00");
  });
  it("treats invalid input as 0:00", () => {
    expect(formatTime(NaN)).toBe("0:00");
    expect(formatTime(-3)).toBe("0:00");
  });
});
