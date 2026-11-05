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
    expect(existsSync(`public${creative.hero.image.src}`)).toBe(true);
  });

  it("rolls are R1..R4 in spec order with the spec's frame counts", () => {
    expect(creative.rolls.map((r) => [r.id, r.frames.length])).toEqual([
      ["light", 5],
      ["street", 4],
      ["stage", 4],
      ["portrait", 1],
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
    expect(creative.hero.line).toBe("Photographs and music. Greencastle, Indiana · Dhaka.");
    expect(creative.hero.cta).toBe("See the rolls");
    expect(creative.now).toBe("shooting on 35mm around Greencastle · learning slide guitar");
    expect(creative.music.handle).toBe("@labib.onrecord");
    expect(creative.contact.headline).toBe("Say hello.");
  });
});
