// @vitest-environment node
import { it, expect } from "vitest";
import { PHOTO_MAP, ALT, DRAFTS, slugify, buildManifest, findDraftSource, parseArgs } from "./prepare-media.mjs";

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

it("has exactly one alt sentence per frame in every roll", () => {
  for (const [id, files] of Object.entries(PHOTO_MAP.rolls)) {
    expect(ALT.rolls[id]).toHaveLength(files.length);
    for (const alt of ALT.rolls[id]) expect(alt.trim()).not.toBe("");
  }
});

it("buildManifest throws rather than emit an empty alt", () => {
  const two = [{ width: 1, height: 1 }, { width: 1, height: 1 }];
  expect(() => buildManifest({ hero: { width: 1, height: 1 }, rolls: { portrait: two }, drafts: [] })).toThrow(/alt/);
});

it("drafts are keyed by slug with fixed titles", () => {
  expect(DRAFTS).toEqual([
    { slug: "fog", title: "Fog" },
    { slug: "untitled-1", title: "Untitled 1" },
    { slug: "dragonfly", title: "Dragonfly" },
  ]);
});

it("findDraftSource matches a file by slug, with or without a <hex>- prefix", () => {
  expect(findDraftSource(["1164959c-Fog.m4a", "notes.txt"], "fog")).toBe("1164959c-Fog.m4a");
  expect(findDraftSource(["Fog.m4a"], "fog")).toBe("Fog.m4a");
  expect(findDraftSource(["f68e24c5-Untitled_1.qta"], "untitled-1")).toBe("f68e24c5-Untitled_1.qta");
  expect(findDraftSource(["Untitled 1.wav"], "untitled-1")).toBe("Untitled 1.wav");
});

it("findDraftSource ignores our own .mp3 output when an original is present", () => {
  expect(findDraftSource(["fog.mp3", "1164959c-Fog.m4a"], "fog")).toBe("1164959c-Fog.m4a");
  expect(findDraftSource(["fog.mp3"], "fog")).toBe("fog.mp3");
});

it("findDraftSource throws when none or several files match", () => {
  expect(() => findDraftSource(["Dragonfly.m4a"], "fog")).toThrow(/no file.*fog/i);
  expect(() => findDraftSource(["1164959c-Fog.m4a", "Fog.m4a"], "fog")).toThrow(/several.*fog/i);
});

it("parseArgs rejects a missing value or a flag in its place, and missing folders", () => {
  const here = import.meta.dirname;
  expect(parseArgs(["--photos", here, "--audio", here, "--out", "public"])).toMatchObject({ photos: here, audio: here });
  expect(() => parseArgs(["--photos", "--audio", here, "--out", "public"])).toThrow(/--photos/);
  expect(() => parseArgs(["--photos", here, "--audio", here])).toThrow(/--out/);
  expect(() => parseArgs(["--photos", "/nonexistent-dir-xyz", "--audio", here, "--out", "public"])).toThrow(/not a folder/);
});
