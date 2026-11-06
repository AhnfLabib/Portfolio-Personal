import { describe, it, expect } from "vitest";
import { frameLabel } from "./rollLayout";

describe("rollLayout", () => {
  it("frameLabel pads", () => {
    expect(frameLabel(1, 2)).toBe("R2 · 03");
    expect(frameLabel(0, 11)).toBe("R1 · 12");
  });
});
