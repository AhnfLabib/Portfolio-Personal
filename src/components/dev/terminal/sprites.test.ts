import { describe, it, expect } from "vitest";
import { SKINS } from "./commands";
import * as sprites from "./sprites";
import { CAT, CAT_SHADES, PALETTE, toRects, type CatPose, type Sprite } from "./sprites";

const CAT_POSES: CatPose[] = [
  "sit",
  "tail-flick",
  "groom",
  "stretch",
  "yawn",
  "sleep",
  "look",
  "walk",
  "hop",
  "purr",
  "shades",
  "look-l",
  "look-r",
  "look-up",
  "paw",
  "hop-react",
  "slow-blink",
  "think",
  "happy",
  "love",
];

function allSprites(): { name: string; sprite: Sprite; maxW: number; maxH: number }[] {
  const out: { name: string; sprite: Sprite; maxW: number; maxH: number }[] = [];
  for (const skin of SKINS) {
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
  it("only the cat remains: no Ahnaf sprite is exported", () => {
    expect(Object.keys(sprites)).not.toContain("AHNAF");
  });

  it("every pose exists for every skin", () => {
    for (const skin of SKINS) {
      expect(Object.keys(CAT[skin]).sort()).toEqual([...CAT_POSES].sort());
      expect(Object.keys(CAT_SHADES[skin]).sort()).toEqual([...CAT_POSES].sort());
    }
  });

  it("every sprite has a bg outline: no fill touches a clear pixel", () => {
    for (const { name, sprite } of allSprites()) {
      for (const f of sprite.frames) {
        f.forEach((row, y) =>
          [...row].forEach((c, x) => {
            if (c === "." || c === "b") return;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const n = f[y + dy]?.[x + dx];
              if (n !== undefined) expect(n, `${name} (${x},${y})`).not.toBe(".");
            }
          }),
        );
      }
    }
  });

  it("main fills are light: ink and ink-soft outnumber ink-faint", () => {
    const t = text(CAT.default.sit);
    const count = (c: string) => t.split(c).length - 1;
    expect(count("#") + count("s")).toBeGreaterThan(count("f") * 5);
  });

  it("every frame is rectangular and within bounds; the cat is 24×24", () => {
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
      expect(new Set(CAT_POSES.map((p) => text(CAT[skin][p]))).size, skin).toBe(CAT_POSES.length);
    }
  });

  it("skins actually change the silhouette", () => {
    for (const skin of SKINS.filter((s) => s !== "default")) {
      expect(CAT[skin].sit.frames, skin).not.toEqual(CAT.default.sit.frames);
    }
  });

  it("shades: lenses on the shades pose and on every CAT_SHADES frame, never recoloured", () => {
    for (const skin of SKINS) {
      expect(CAT_SHADES[skin].shades).toEqual(CAT[skin].shades);
      if (skin === "shades") continue; // already wears them everywhere
      for (const pose of CAT_POSES.filter((p) => p !== "shades")) {
        expect(CAT_SHADES[skin][pose].frames, `${skin}/${pose}`).not.toEqual(CAT[skin][pose].frames);
      }
      // the lenses are bg-dark whatever the skin does to the fur
      expect(text(CAT_SHADES[skin].sit)).toMatch(/b{10}/);
    }
  });

  it("look-l is look-r mirrored; look-up raises the eyes; paw is a 300 ms one-shot swipe; hop-react leaves the ground", () => {
    for (const skin of SKINS) {
      const c = CAT[skin];
      c["look-r"].frames.forEach((f, i) => expect(c["look-l"].frames[i], `${skin} #${i}`).toEqual(f.map((r) => [...r].reverse().join(""))));
    }
    const c = CAT.default;
    expect(c["look-up"].frames[0]).not.toEqual(c.sit.frames[0]);
    expect([c.paw.loop, c.paw.frames.length * c.paw.ms]).toEqual([false, 300]);
    // the swiping paw reaches further forward (right) than the sitting cat does
    const right = (f: string[]) => Math.max(...f.map((r) => r.replace(/[.b]+$/, "").length - 1));
    expect(right(c.paw.frames[1])).toBeGreaterThan(right(c.sit.frames[0]));
    expect(c["hop-react"].loop).toBe(false);
    const top = (f: string[]) => f.findIndex((r) => /[^.]/.test(r));
    expect(Math.min(...c["hop-react"].frames.map(top))).toBeLessThan(top(c.sit.frames[0]));
    expect(c["slow-blink"].loop).toBe(false);
    expect(c["slow-blink"].frames.length).toBeGreaterThanOrEqual(3);
  });

  it("think: three 400 ms frames; 2×2 ink dots, 2 px apart, above the head, each new one a row higher", () => {
    const t = CAT.default.think;
    expect([t.frames.length, t.ms]).toEqual([3, 400]);
    /** Top-left corners of every 2×2 ink block in the rows above the head (0–3). */
    const dots = (f: string[]) => {
      const out: [number, number][] = [];
      for (let y = 0; y < 3; y++) for (let x = 0; x < 23; x++) if (f[y][x] === "#" && f[y][x + 1] === "#" && f[y + 1][x] === "#" && f[y + 1][x + 1] === "#") out.push([y, x]);
      return out;
    };
    const expected: [number, number][] = [[2, 13], [1, 17], [0, 21]];
    t.frames.forEach((f, i) => {
      expect(dots(f), `frame ${i}`).toEqual(expected.slice(0, i + 1).sort((a, b) => a[0] - b[0]));
      // nothing but the dots and their bg outline above the head
      expect(f.slice(0, 4).join("").replace(/[#b.]/g, ""), `frame ${i}`).toBe("");
      expect(f.slice(0, 4).join("").split("#").length - 1).toBe(4 * (i + 1));
    });
    // spaced 2 px apart, each one row higher than the last
    expect(expected[1][1] - (expected[0][1] + 2)).toBe(2);
    expect(expected[2][1] - (expected[1][1] + 2)).toBe(2);
  });

  it("happy: ears up (the head higher than sitting) for a short beat", () => {
    const top = (f: string[]) => f.findIndex((r) => /[^.]/.test(r));
    expect(top(CAT.default.happy.frames[0])).toBeLessThan(top(CAT.default.sit.frames[0]));
  });

  it("love: 2–3 frames at 500 ms, a blush on both cheeks and small hearts rising", () => {
    const l = CAT.default.love;
    expect(l.ms).toBe(500);
    expect(l.frames.length).toBeGreaterThanOrEqual(2);
    expect(l.frames.length).toBeLessThanOrEqual(3);
    // two blush pixels on the face (row 10, cheeks), apart from the collar
    for (const f of l.frames) expect(f[10].split("a").length - 1).toBe(2);
    // hearts rise: the topmost accent pixel above the head moves up between frames
    const topHeart = (f: string[]) => f.findIndex((r) => r.slice(0, 11).includes("a"));
    expect(topHeart(l.frames[1])).toBeLessThan(topHeart(l.frames[0]));
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
