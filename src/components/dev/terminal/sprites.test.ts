import { describe, it, expect } from "vitest";
import { SKINS } from "./commands";
import { AHNAF, CAT, CAT_SHADES, PALETTE, toRects, type AhnafPose, type CatPose, type Sprite } from "./sprites";

const AHNAF_POSES: AhnafPose[] = ["idle", "blink", "turn", "typing", "thinking", "happy", "confused", "shades"];
const CAT_POSES: CatPose[] = ["sit", "tail-flick", "groom", "stretch", "yawn", "sleep", "look", "walk", "hop", "purr", "shades"];

function allSprites(): { name: string; sprite: Sprite; maxW: number; maxH: number }[] {
  const out: { name: string; sprite: Sprite; maxW: number; maxH: number }[] = [];
  for (const skin of SKINS) {
    for (const pose of AHNAF_POSES) out.push({ name: `ahnaf/${skin}/${pose}`, sprite: AHNAF[skin][pose], maxW: 32, maxH: 32 });
    for (const pose of CAT_POSES) {
      out.push({ name: `cat/${skin}/${pose}`, sprite: CAT[skin][pose], maxW: 32, maxH: 24 });
      out.push({ name: `cat-shades/${skin}/${pose}`, sprite: CAT_SHADES[skin][pose], maxW: 32, maxH: 24 });
    }
  }
  return out;
}

const text = (s: Sprite, i = 0) => s.frames[i].join("\n");
const distinct = (s: Sprite) => new Set(s.frames.map((f) => f.join("\n"))).size;

describe("sprites", () => {
  it("every pose exists for every skin", () => {
    for (const skin of SKINS) {
      expect(Object.keys(AHNAF[skin]).sort()).toEqual([...AHNAF_POSES].sort());
      expect(Object.keys(CAT[skin]).sort()).toEqual([...CAT_POSES].sort());
      expect(Object.keys(CAT_SHADES[skin]).sort()).toEqual([...CAT_POSES].sort());
    }
  });

  it("every frame is rectangular and within bounds; Ahnaf is 32 rows, the cat 24", () => {
    for (const { name, sprite: s, maxW, maxH } of allSprites()) {
      expect(s.w, name).toBeLessThanOrEqual(maxW);
      expect(s.h, name).toBeLessThanOrEqual(maxH);
      expect(s.frames.length, name).toBeGreaterThan(0);
      for (const f of s.frames) {
        expect(f, name).toHaveLength(s.h);
        for (const row of f) expect(row, name).toHaveLength(s.w);
      }
    }
    for (const skin of SKINS) {
      for (const pose of AHNAF_POSES) expect([AHNAF[skin][pose].w, AHNAF[skin][pose].h]).toEqual([32, 32]);
      for (const pose of CAT_POSES) expect([CAT[skin][pose].w, CAT[skin][pose].h]).toEqual([24, 24]);
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

  it("animated sprites change between frames and have a frame time; still ones have neither", () => {
    for (const { name, sprite: s } of allSprites()) {
      if (s.frames.length > 1) {
        expect(s.ms, name).toBeGreaterThan(0);
        expect(distinct(s), name).toBeGreaterThanOrEqual(2);
        for (let i = 1; i < s.frames.length; i++) expect(s.frames[i], `${name} #${i}`).not.toEqual(s.frames[i - 1]);
      } else expect(s.ms, name).toBe(0);
    }
  });

  it("Ahnaf: breathing idle, typing hands, thought dots, a bouncing grin, a tilted '?'", () => {
    const a = AHNAF.default;
    const frames = (p: AhnafPose) => [a[p].frames.length, a[p].ms];
    expect(frames("idle")).toEqual([2, 1200]);
    expect(a.idle.frames[1]).toEqual([".".repeat(32), ...a.idle.frames[0].slice(0, -1)]); // a 1-px breath
    expect(frames("blink")).toEqual([1, 0]);
    expect(frames("turn")).toEqual([2, 1200]);
    expect(frames("typing")[0]).toBe(2);
    expect(frames("thinking")[0]).toBe(3);
    // the dots fill in one by one
    const accents = a.thinking.frames.map((f) => f.slice(0, 4).join("").split("a").length - 1);
    expect(accents[0]).toBeLessThan(accents[1]);
    expect(accents[1]).toBeLessThan(accents[2]);
    expect(frames("happy")[0]).toBe(2);
    expect(a.happy.frames[1]).toEqual([...a.happy.frames[0].slice(1), ".".repeat(32)]); // bounce
    expect(frames("confused")[0]).toBe(2);
    expect(text(a.confused)).toContain("a");
  });

  it("Ahnaf keeps the hair swoop, round glasses, goatee and a hoodie with accent drawstrings", () => {
    const idle = AHNAF.default.idle.frames[0];
    expect(idle.slice(1, 9).join("")).toMatch(/f{10,}/); // hair mass
    expect(idle.slice(3, 7).join("")).toMatch(/#{3,}/); // the shine along the swoop
    expect(idle[12]).toMatch(/#{4}s+#{4}/); // two round lenses
    expect(idle.slice(20, 23).join("")).toMatch(/ff/); // goatee
    expect(idle[30]).toContain("a"); // drawstring tips
  });

  it("cat: 4-frame walk at 150 ms, sit sways with an ear twitch, groom ×3, stretch ×2, yawn ×2, sleep breathes, hop crouches first", () => {
    const c = CAT.default;
    expect([c.walk.frames.length, c.walk.ms]).toEqual([4, 150]);
    expect([c.sit.ms, c.sit.frames.length >= 2]).toEqual([600, true]);
    expect(distinct(c.sit)).toBeGreaterThanOrEqual(3); // two sways and a twitch
    expect(c.groom.frames).toHaveLength(3);
    expect(c.stretch.frames).toHaveLength(2);
    expect([c.yawn.frames.length, c.yawn.loop]).toEqual([2, false]);
    expect(c.sleep.frames).toHaveLength(2);
    expect(c.sleep.ms).toBeGreaterThanOrEqual(800);
    expect([c.hop.frames.length, c.hop.loop]).toEqual([2, false]);
    // crouched: the crouch frame's top pixel sits lower than the leap's
    const top = (f: string[]) => f.findIndex((r) => /[^.]/.test(r));
    expect(top(c.hop.frames[0])).toBeGreaterThan(top(c.hop.frames[1]));
  });

  it("the cat has an ink-soft belly/muzzle on faint fur and accent eyes", () => {
    const sit = text(CAT.default.sit);
    for (const ch of ["s", "f", "a", "#"]) expect(sit).toContain(ch);
  });

  it("poses differ from each other (the shades skin wears shades everywhere, so it is exempt)", () => {
    for (const skin of SKINS.filter((s) => s !== "shades")) {
      expect(new Set(AHNAF_POSES.map((p) => text(AHNAF[skin][p]))).size, skin).toBe(AHNAF_POSES.length);
      expect(new Set(CAT_POSES.map((p) => text(CAT[skin][p]))).size, skin).toBe(CAT_POSES.length);
    }
  });

  it("skins actually change the silhouette", () => {
    for (const skin of SKINS.filter((s) => s !== "default")) {
      expect(AHNAF[skin].idle.frames, skin).not.toEqual(AHNAF.default.idle.frames);
      expect(CAT[skin].sit.frames, skin).not.toEqual(CAT.default.sit.frames);
    }
  });

  it("shades: lenses on the shades pose and on every CAT_SHADES frame, never recoloured", () => {
    for (const skin of SKINS) {
      expect(CAT_SHADES[skin].shades).toEqual(CAT[skin].shades);
      for (const pose of CAT_POSES) for (const f of CAT_SHADES[skin][pose].frames) expect(f.join("\n"), `${skin}/${pose}`).toMatch(/######/);
    }
    expect(text(AHNAF.default.shades)).not.toEqual(text(AHNAF.default.idle));
  });

  it("purr shows hearts; sleep shows z's", () => {
    for (const f of CAT.default.purr.frames) expect(f.slice(0, 8).join("")).toContain("a");
    for (const f of CAT.default.sleep.frames) expect(f.slice(0, 12).join("")).toContain("a");
  });

  it("toRects skips '.' and maps colours", () => {
    expect(toRects(["#.", ".a"], PALETTE)).toEqual([
      { x: 0, y: 0, fill: "var(--color-ink)" },
      { x: 1, y: 1, fill: "var(--color-accent)" },
    ]);
  });
});
