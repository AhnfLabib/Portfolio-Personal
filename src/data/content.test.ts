// @vitest-environment node
/// <reference types="node" />
import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { creative, navCreative } from "./content";

describe("creative content model", () => {
  it("every frame file exists with its 800 variant and positive dimensions", () => {
    for (const r of creative.rolls)
      for (const f of r.frames) {
        expect(existsSync(`public${f.src}`)).toBe(true);
        expect(existsSync(`public${f.src.replace(/\.jpg$/, "-800.jpg")}`)).toBe(true);
        expect(f.width).toBeGreaterThan(0);
        expect(f.height).toBeGreaterThan(0);
        expect(f.alt.length).toBeGreaterThan(10);
      }
  });

  it("hero wall is exactly five frames, each one a roll frame (no duplicate files)", () => {
    const wall = creative.hero.wall;
    expect(wall).toHaveLength(5);
    const rollFrames = creative.rolls.flatMap((r) => r.frames);
    for (const f of wall) expect(rollFrames).toContain(f);
    expect(wall.map((f) => f.src)).toEqual([
      "/gallery/r4-02.jpg",
      "/gallery/r4-04.jpg",
      "/gallery/r3-01.jpg",
      "/gallery/r2-04.jpg",
      "/gallery/r4-03.jpg",
    ]);
    expect(wall[0].alt).toBe("Two friends in dark coats standing in a doorway at night.");
    expect(wall[1].alt).toBe("Two friends back to back in a studio, leather jacket and white shirt.");
    expect(wall[4].alt).toBe("A portrait in a cream knit shirt against a grey studio wall.");
    expect(creative.hero).not.toHaveProperty("image");
  });

  it("the old eclipse hero file is gone; the eclipse stays in Light", () => {
    expect(existsSync("public/gallery/hero.jpg")).toBe(false);
    expect(creative.rolls[0].frames[0].src).toBe("/gallery/r1-01.jpg");
  });

  it("rolls are R1..R4 in spec order with the spec's frame counts", () => {
    expect(creative.rolls.map((r) => [r.id, r.frames.length])).toEqual([
      ["light", 5],
      ["street", 4],
      ["stage", 4],
      ["portrait", 4],
    ]);
  });

  it("covers carry reel ids, drafts carry existing files", () => {
    expect(creative.music.covers.map((c) => c.reel)).toEqual([
      "DfWL_P3x3Cs",
      "Des9G6mOc-7",
      "DefxSxpNfCp",
    ]);
    expect(creative.music.drafts.length).toBeGreaterThan(0);
    for (const d of creative.music.drafts) {
      expect(existsSync(`public${d.src}`)).toBe(true);
      expect(d.duration).toBeGreaterThan(0);
    }
  });

  it("navCreative is Statement, Rolls, Music, Contact", () => {
    expect(navCreative).toEqual([
      { label: "Statement", href: "#statement" },
      { label: "Rolls", href: "#rolls" },
      { label: "Music", href: "#music" },
      { label: "Contact", href: "#contact" },
    ]);
  });

  it("carries the spec copy", () => {
    expect(creative.hero.line).toBe("Indianapolis, IN · 35mm & digital · 2024–26");
    expect(creative.hero.cta).toBe("See the rolls");
    expect(creative.now).toBe("shooting on 35mm around Indianapolis · learning slide guitar");
    expect(creative.tags).toEqual(["35mm", "Indianapolis", "slide guitar"]);
    expect(creative.music.handle).toBe("@labib.onrecord");
    expect(creative.contact.headline).toBe("Say hello.");
  });
});
