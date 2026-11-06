import { describe, it, expect } from "vitest";
import { CLOSE_PX, NEAR_PX, distanceTo, facingFor, zoneFor } from "./proximity";

const box = { x: 100, y: 200, w: 32, h: 32 }; // spans x 100–132, y 200–232

describe("proximity", () => {
  it("measures the distance to the box's nearest edge (0 inside)", () => {
    expect(distanceTo({ x: 116, y: 216 }, box)).toBe(0);
    expect(distanceTo({ x: 90, y: 216 }, box)).toBe(10);
    expect(distanceTo({ x: 142, y: 216 }, box)).toBe(10);
    expect(distanceTo({ x: 116, y: 180 }, box)).toBe(20);
    expect(distanceTo({ x: 116, y: 252 }, box)).toBe(20);
    expect(distanceTo({ x: 97, y: 196 }, box)).toBe(5); // corner: 3-4-5
  });

  it("zones: close under 40 px, near under 120 px, far beyond", () => {
    expect([NEAR_PX, CLOSE_PX]).toEqual([120, 40]);
    expect(zoneFor({ x: 116, y: 216 }, box)).toBe("close");
    expect(zoneFor({ x: 100 - 39.9, y: 216 }, box)).toBe("close");
    expect(zoneFor({ x: 100 - 40, y: 216 }, box)).toBe("near");
    expect(zoneFor({ x: 132 + 119.9, y: 216 }, box)).toBe("near");
    expect(zoneFor({ x: 132 + 120, y: 216 }, box)).toBe("far");
    expect(zoneFor({ x: 116, y: 200 - 119 }, box)).toBe("near");
    expect(zoneFor({ x: 116, y: 232 + 500 }, box)).toBe("far");
  });

  it("faces toward the cursor: left of the box's centre is -1, right (or dead centre) is 1", () => {
    expect(facingFor({ x: 10, y: 216 }, box)).toBe(-1);
    expect(facingFor({ x: 115, y: 0 }, box)).toBe(-1);
    expect(facingFor({ x: 116, y: 0 }, box)).toBe(1);
    expect(facingFor({ x: 500, y: 216 }, box)).toBe(1);
  });
});
