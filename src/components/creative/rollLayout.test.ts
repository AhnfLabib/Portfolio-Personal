import { describe, it, expect } from "vitest";
import { columnsFor, frameLabel } from "./rollLayout";

describe("rollLayout", () => {
  it("columnsFor", () => {
    expect(columnsFor(390)).toBe(1);
    expect(columnsFor(639)).toBe(1);
    expect(columnsFor(640)).toBe(2);
    expect(columnsFor(1023)).toBe(2);
    expect(columnsFor(1024)).toBe(3);
  });

  it("frameLabel pads", () => {
    expect(frameLabel(1, 2)).toBe("R2 · 03");
    expect(frameLabel(0, 11)).toBe("R1 · 12");
  });
});
