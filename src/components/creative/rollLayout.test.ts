import { describe, it, expect } from "vitest";
import { columnsFor, spanFor, frameLabel } from "./rollLayout";
import type { Frame } from "../../data/content";

describe("rollLayout", () => {
  it("columnsFor", () => {
    expect(columnsFor(390)).toBe(1);
    expect(columnsFor(639)).toBe(1);
    expect(columnsFor(640)).toBe(2);
    expect(columnsFor(1023)).toBe(2);
    expect(columnsFor(1024)).toBe(3);
  });

  it("spanFor: portrait spans 2 rows except in one column; first frame spans 2 cols at 3 columns", () => {
    const p = { width: 1500, height: 2000 } as Frame;
    const l = { width: 2000, height: 1125 } as Frame;
    expect(spanFor(p, 1, 3)).toEqual({ col: 1, row: 2 });
    expect(spanFor(p, 1, 2)).toEqual({ col: 1, row: 2 });
    expect(spanFor(p, 1, 1)).toEqual({ col: 1, row: 1 });
    expect(spanFor(l, 0, 3)).toEqual({ col: 2, row: 1 });
    expect(spanFor(l, 0, 2)).toEqual({ col: 1, row: 1 });
    expect(spanFor(l, 0, 1)).toEqual({ col: 1, row: 1 });
    expect(spanFor(l, 2, 3)).toEqual({ col: 1, row: 1 });
    expect(spanFor(p, 0, 3)).toEqual({ col: 2, row: 2 });
  });

  it("frameLabel pads", () => {
    expect(frameLabel(1, 2)).toBe("R2 · 03");
    expect(frameLabel(0, 11)).toBe("R1 · 12");
  });
});
