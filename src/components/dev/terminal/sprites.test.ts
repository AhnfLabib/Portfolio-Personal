import { describe, it, expect } from "vitest";
import { SKINS } from "./commands";
import { AHNAF, CAT, PALETTE, toRects, type AhnafPose, type CatPose, type Sprite } from "./sprites";

const AHNAF_POSES: AhnafPose[] = ["idle", "blink", "typing", "thinking", "happy", "confused", "shades"];
const CAT_POSES: CatPose[] = ["sleep", "awake", "stretch", "walk1", "walk2", "purr", "shades"];

function allSprites(): { name: string; sprite: Sprite; maxW: number; maxH: number }[] {
  const out: { name: string; sprite: Sprite; maxW: number; maxH: number }[] = [];
  for (const skin of SKINS) {
    for (const pose of AHNAF_POSES) out.push({ name: `ahnaf/${skin}/${pose}`, sprite: AHNAF[skin][pose], maxW: 24, maxH: 24 });
    for (const pose of CAT_POSES) out.push({ name: `cat/${skin}/${pose}`, sprite: CAT[skin][pose], maxW: 20, maxH: 16 });
  }
  return out;
}

describe("sprites", () => {
  it("every pose exists for every skin", () => {
    for (const skin of SKINS) {
      expect(Object.keys(AHNAF[skin]).sort()).toEqual([...AHNAF_POSES].sort());
      expect(Object.keys(CAT[skin]).sort()).toEqual([...CAT_POSES].sort());
    }
  });

  it("every sprite frame is rectangular and within bounds", () => {
    for (const { name, sprite: s, maxW, maxH } of allSprites()) {
      expect(s.w, name).toBeLessThanOrEqual(maxW);
      expect(s.h, name).toBeLessThanOrEqual(maxH);
      expect(s.frames.length, name).toBeGreaterThan(0);
      for (const f of s.frames) {
        expect(f, name).toHaveLength(s.h);
        for (const row of f) expect(row, name).toHaveLength(s.w);
      }
    }
  });

  it("frames only use palette chars or '.'", () => {
    const allowed = new Set([...Object.keys(PALETTE), "."]);
    for (const { name, sprite } of allSprites()) {
      for (const f of sprite.frames) for (const row of f) for (const ch of row) expect(allowed.has(ch), `${name}: '${ch}'`).toBe(true);
    }
  });

  it("palette maps only to site colour tokens", () => {
    for (const v of Object.values(PALETTE)) expect(v).toMatch(/^var\(--color-(ink|ink-soft|ink-faint|accent|bg|surface)\)$/);
  });

  it("skins actually change the silhouette", () => {
    for (const skin of SKINS.filter((s) => s !== "default")) {
      expect(AHNAF[skin].idle.frames, skin).not.toEqual(AHNAF.default.idle.frames);
      expect(CAT[skin].awake.frames, skin).not.toEqual(CAT.default.awake.frames);
    }
  });

  it("hacker cat keeps its shades lenses dark (stamped after the recolour)", () => {
    const lensRow = CAT.hacker.shades.frames[0][6];
    expect(lensRow.slice(2, 7)).toBe("#####");
    expect(CAT.hacker.shades.frames[0].join("")).not.toContain("a");
  });

  it("toRects skips '.' and maps colours", () => {
    expect(toRects(["#.", ".a"], PALETTE)).toEqual([
      { x: 0, y: 0, fill: "var(--color-ink)" },
      { x: 1, y: 1, fill: "var(--color-accent)" },
    ]);
  });
});
