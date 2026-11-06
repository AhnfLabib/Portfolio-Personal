import { describe, it, expect } from "vitest";
import { frameSrcSet } from "./frameSrc";

const base = { src: "/gallery/x.jpg", width: 1600, height: 900, alt: "x" };

describe("frameSrcSet", () => {
  it("lists the -800 and full files when there are no variants", () => {
    expect(frameSrcSet(base)).toBe("/gallery/x-800.jpg 800w, /gallery/x.jpg 1600w");
  });

  it("uses the portrait -800 file's real width", () => {
    expect(frameSrcSet({ ...base, width: 1200, height: 1600 })).toBe("/gallery/x-800.jpg 600w, /gallery/x.jpg 1200w");
  });

  it("puts variants between the -800 and full candidates, sorted by width", () => {
    const frame = {
      ...base,
      variants: [
        { src: "/gallery/x-1400.jpg", width: 1400 },
        { src: "/gallery/x-1200.jpg", width: 1200 },
      ],
    };
    expect(frameSrcSet(frame)).toBe(
      "/gallery/x-800.jpg 800w, /gallery/x-1200.jpg 1200w, /gallery/x-1400.jpg 1400w, /gallery/x.jpg 1600w",
    );
  });
});
