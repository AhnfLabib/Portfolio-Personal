// @vitest-environment node
import { it, expect } from "vitest";
import { PHOTO_MAP, slugify, buildManifest } from "./prepare-media.mjs";

// The brief said 15 here, but its own roll lists (5+4+4+1) and the spec
// ("15 are used" = hero + 14) give 14 roll frames.
it("maps 15 of the supplied photographs to hero + 14 roll frames", () => {
  expect(PHOTO_MAP.hero).toBe("8.jpg");
  expect(Object.values(PHOTO_MAP.rolls).flat()).toHaveLength(14);
  expect(PHOTO_MAP.rolls.light).toEqual(["9.jpg", "5.jpg", "10.jpg", "6.jpg", "19.jpg"]);
  expect(PHOTO_MAP.rolls.street).toEqual(["7.jpg", "18.jpg", "12.jpg", "20.jpg"]);
  expect(PHOTO_MAP.rolls.stage).toEqual(["13.jpg", "14.jpg", "15.jpg", "16.jpg"]);
  expect(PHOTO_MAP.rolls.portrait).toEqual(["11.jpg"]);
});

it("slugify", () => {
  expect(slugify("Untitled_1.qta")).toBe("untitled-1");
  expect(slugify("Fog.m4a")).toBe("fog");
});

it("buildManifest names files r<roll>-<nn> and keeps dimensions", () => {
  const m = buildManifest({
    hero: { width: 2000, height: 1125 },
    rolls: { light: [{ width: 2000, height: 1125 }], street: [], stage: [], portrait: [] },
    drafts: [{ title: "Fog", slug: "fog", duration: 43.9 }],
  });
  expect(m.rolls[0]).toMatchObject({ id: "light", title: "Light" });
  expect(m.rolls[0].frames[0]).toMatchObject({ src: "/gallery/r1-01.jpg", width: 2000, height: 1125 });
  expect(m.drafts[0]).toEqual({ title: "Fog", src: "/audio/fog.mp3", month: "", duration: 44 });
});
