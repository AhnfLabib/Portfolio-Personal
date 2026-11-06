import { describe, it, expect } from "vitest";
import { creative } from "../../data/content";
import { flatNeighbours, nextIndex } from "./lightboxNav";

const rolls = creative.rolls;
const last = { roll: rolls.length - 1, frame: rolls.at(-1)!.frames.length - 1 };

describe("nextIndex", () => {
  it("moves within a roll", () => {
    expect(nextIndex(rolls, { roll: 0, frame: 1 }, 1)).toEqual({ roll: 0, frame: 2 });
    expect(nextIndex(rolls, { roll: 0, frame: 2 }, -1)).toEqual({ roll: 0, frame: 1 });
  });

  it("nextIndex crosses rolls and clamps", () => {
    expect(nextIndex(rolls, { roll: 0, frame: 4 }, 1)).toEqual({ roll: 1, frame: 0 });
    expect(nextIndex(rolls, { roll: 1, frame: 0 }, -1)).toEqual({ roll: 0, frame: 4 });
    expect(nextIndex(rolls, last, 1)).toEqual(last);
    expect(nextIndex(rolls, { roll: 0, frame: 0 }, -1)).toEqual({ roll: 0, frame: 0 });
  });

  it("prev from the first frame of the last roll lands on the last frame of the previous roll", () => {
    const prevRoll = rolls.length - 2;
    expect(nextIndex(rolls, { roll: last.roll, frame: 0 }, -1)).toEqual({
      roll: prevRoll,
      frame: rolls[prevRoll].frames.length - 1,
    });
  });
});

describe("flatNeighbours", () => {
  it("returns the frames on either side, across rolls", () => {
    expect(flatNeighbours(rolls, { roll: 1, frame: 0 })).toEqual({
      prev: rolls[0].frames[4],
      next: rolls[1].frames[1],
    });
  });

  it("omits neighbours past the ends", () => {
    expect(flatNeighbours(rolls, { roll: 0, frame: 0 })).toEqual({
      prev: undefined,
      next: rolls[0].frames[1],
    });
    expect(flatNeighbours(rolls, last)).toEqual({
      prev: rolls[last.roll].frames[last.frame - 1],
      next: undefined,
    });
  });
});
