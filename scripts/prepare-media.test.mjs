// @vitest-environment node
import { it, expect } from "vitest";
import sharp from "sharp";
import { PHOTO_MAP, ALT, DRAFTS, slugify, buildManifest, findDraftSource, parseArgs, borderCrop } from "./prepare-media.mjs";

// Light 5 + Street 4 + Stage 4 + Portrait 4 = 17 roll frames. The eclipse
// (8.jpg) no longer has a hero file of its own: the hero is a wall of roll
// frames (content.ts), and the eclipse stays in Light as r1-01 (9.jpg).
it("maps 17 of the supplied photographs to roll frames and has no hero file", () => {
  expect(PHOTO_MAP).not.toHaveProperty("hero");
  expect(ALT).not.toHaveProperty("hero");
  expect(Object.values(PHOTO_MAP.rolls).flat()).toHaveLength(17);
  expect(PHOTO_MAP.rolls.light).toEqual(["9.jpg", "5.jpg", "10.jpg", "6.jpg", "19.jpg"]);
  expect(PHOTO_MAP.rolls.street).toEqual(["7.jpg", "18.jpg", "12.jpg", "20.jpg"]);
  expect(PHOTO_MAP.rolls.stage).toEqual(["13.jpg", "14.jpg", "15.jpg", "16.jpg"]);
  expect(PHOTO_MAP.rolls.portrait).toEqual(["11.jpg", "24.jpg", "25.jpg", "26.jpg"]);
});

it("slugify", () => {
  expect(slugify("Untitled_1.qta")).toBe("untitled-1");
  expect(slugify("Fog.m4a")).toBe("fog");
});

it("buildManifest names files r<roll>-<nn> and keeps dimensions", () => {
  const m = buildManifest({
    rolls: { light: [{ width: 2000, height: 1125 }], street: [], stage: [], portrait: [] },
    drafts: [{ title: "Fog", slug: "fog", duration: 43.9 }],
  });
  expect(m.rolls[0]).toMatchObject({ id: "light", title: "Light" });
  expect(m.rolls[0].frames[0]).toMatchObject({ src: "/gallery/r1-01.jpg", width: 2000, height: 1125 });
  expect(m.drafts[0]).toEqual({ title: "Fog", src: "/audio/fog.mp3", month: "", duration: 44 });
  expect(m).not.toHaveProperty("hero");
});

it("has exactly one alt sentence per frame in every roll", () => {
  for (const [id, files] of Object.entries(PHOTO_MAP.rolls)) {
    expect(ALT.rolls[id]).toHaveLength(files.length);
    for (const alt of ALT.rolls[id]) expect(alt.trim()).not.toBe("");
  }
});

it("buildManifest throws rather than emit an empty alt", () => {
  const two = [{ width: 1, height: 1 }, { width: 1, height: 1 }];
  expect(() => buildManifest({ rolls: { light: [], street: [], stage: [], portrait: [...two, ...two, ...two] }, drafts: [] })).toThrow(/alt/);
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

// A 400x300 canvas: grey (128) image inside a 40 px white border.
async function bordered({ width = 400, height = 300, border = 40 } = {}) {
  const inner = await sharp({
    create: { width: width - 2 * border, height: height - 2 * border, channels: 3, background: { r: 128, g: 128, b: 128 } },
  })
    .png()
    .toBuffer();
  return sharp({ create: { width, height, channels: 3, background: { r: 255, g: 255, b: 255 } } })
    .composite([{ input: inner, left: border, top: border }])
    .png()
    .toBuffer();
}

it("borderCrop finds the image inside a white border, inset 2 px", async () => {
  // inner 320x220 at (40,40), minus 2 px on each side
  expect(await borderCrop(sharp, await bordered())).toEqual({ left: 42, top: 42, width: 316, height: 216 });
});

it("borderCrop skips a thin dark seam at the very edge of a scan", async () => {
  const seamed = await sharp(await bordered())
    .composite([{ input: { create: { width: 400, height: 1, channels: 3, background: "#606060" } }, left: 0, top: 299 }])
    .png()
    .toBuffer();
  expect(await borderCrop(sharp, seamed)).toEqual({ left: 42, top: 42, width: 316, height: 216 });
});

it("borderCrop measures the inset from the end of a soft (scanned) border edge", async () => {
  const soft = await sharp(await bordered()).blur(2).png().toBuffer();
  const crop = await borderCrop(sharp, soft);
  expect(crop).not.toBeNull();
  // Past the fade, so no light seam is left on any edge of the result.
  const { data, info } = await sharp(soft).extract(crop).greyscale().raw().toBuffer({ resolveWithObject: true });
  const at = (x, y) => data[y * info.width + x];
  const mid = { x: info.width >> 1, y: info.height >> 1 };
  for (const v of [at(mid.x, 0), at(mid.x, info.height - 1), at(0, mid.y), at(info.width - 1, mid.y)]) {
    expect(v).toBeLessThan(140);
  }
  expect(crop.width).toBeGreaterThanOrEqual(300);
});

it("borderCrop leaves photos with no (or a thin) border alone", async () => {
  const plain = await sharp({ create: { width: 400, height: 300, channels: 3, background: { r: 128, g: 128, b: 128 } } })
    .png()
    .toBuffer();
  expect(await borderCrop(sharp, plain)).toBeNull();
  expect(await borderCrop(sharp, await bordered({ border: 6 }))).toBeNull();
  // A thin soft border: seam + run + fade may reach 8 px, the bright run does not.
  for (const sigma of [1, 2]) {
    expect(await borderCrop(sharp, await sharp(await bordered({ border: 6 })).blur(sigma).png().toBuffer())).toBeNull();
  }
  // A bright sky along one edge only is not a border.
  const sky = await sharp(plain)
    .composite([{ input: { create: { width: 400, height: 60, channels: 3, background: "#ffffff" } }, left: 0, top: 0 }])
    .png()
    .toBuffer();
  expect(await borderCrop(sharp, sky)).toBeNull();
});

it("borderCrop keeps a dark vignette inside a hard border (no fade walk)", async () => {
  // Hard 20 px white border; inside, a dark edge gradient that darkens 6 per px
  // inward (100 at the edge, floor 20) — not a border fade.
  const [w, h, border] = [360, 260, 20];
  const px = Buffer.alloc(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) px[y * w + x] = Math.max(20, 100 - 6 * Math.min(x, y, w - 1 - x, h - 1 - y));
  const inner = await sharp(px, { raw: { width: w, height: h, channels: 1 } }).png().toBuffer();
  const img = await sharp({ create: { width: 400, height: 300, channels: 3, background: "#ffffff" } })
    .composite([{ input: inner, left: border, top: border }])
    .png()
    .toBuffer();
  expect(await borderCrop(sharp, img)).toEqual({ left: 22, top: 22, width: 356, height: 256 });
});
