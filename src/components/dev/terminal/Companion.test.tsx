import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import type { ComponentProps } from "react";
import { Companions } from "./Companion";

type Props = ComponentProps<typeof Companions>;
const base: Props = { mood: "idle", skin: "default", shades: false, active: false, petTick: 0, reduceMotion: false };

function setup(overrides: Partial<Props> = {}) {
  let props: Props = { ...base, ...overrides };
  const utils = render(<Companions {...props} />);
  const svg = (who: "ahnaf" | "cat") => utils.container.querySelector(`svg[data-sprite="${who}"]`) as SVGSVGElement;
  return {
    ...utils,
    ahnaf: () => svg("ahnaf").getAttribute("data-pose"),
    ahnafFrame: () => svg("ahnaf").getAttribute("data-frame"),
    cat: () => svg("cat").getAttribute("data-pose"),
    ahnafSvg: () => svg("ahnaf"),
    catSvg: () => svg("cat"),
    catBox: () => svg("cat").parentElement as HTMLElement,
    snapshot: () => [svg("ahnaf").getAttribute("data-pose"), svg("ahnaf").getAttribute("data-frame"), svg("cat").getAttribute("data-pose"), (svg("cat").parentElement as HTMLElement).style.transform, svg("cat").style.transform].join("|"),
    update: (next: Partial<Props>) => {
      props = { ...props, ...next };
      utils.rerender(<Companions {...props} />);
    },
  };
}

const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

let hidden = false;
function setHidden(value: boolean) {
  hidden = value;
  act(() => void document.dispatchEvent(new Event("visibilitychange")));
}

beforeEach(() => {
  vi.useFakeTimers();
  hidden = false;
  vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
  // jsdom has no layout: give the card a desktop-sized box so the cat has room to roam
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(576);
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(175);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Companions", () => {
  it("renders two aria-hidden crisp svgs at the v2 sizes inside a card-sized wrapper", () => {
    const t = setup();
    const wrapper = t.container.firstElementChild as HTMLElement;
    expect(wrapper.className).toBe("pointer-events-none absolute inset-0");
    const svgs = t.container.querySelectorAll("svg");
    expect(svgs).toHaveLength(2);
    for (const s of svgs) {
      expect(s.getAttribute("aria-hidden")).toBe("true");
      expect(s.getAttribute("shape-rendering")).toBe("crispEdges");
      expect(s.getAttribute("viewBox")).toMatch(/^0 0 \d+ \d+$/);
      expect(s.querySelectorAll("rect").length).toBeGreaterThan(0);
    }
    expect(t.ahnafSvg().getAttribute("class")).toContain("h-12");
    expect(t.catSvg().getAttribute("class")).toContain("h-8");
  });

  it("Ahnaf breathes on a 2400 ms cycle even while the card is inactive", () => {
    const t = setup({ active: false });
    expect(t.ahnafFrame()).toBe("0");
    advance(1199);
    expect(t.ahnafFrame()).toBe("0");
    advance(1);
    expect(t.ahnafFrame()).toBe("1");
    advance(1200);
    expect(t.ahnafFrame()).toBe("0");
  });

  it("Ahnaf blinks every 3–4 s for 150 ms, active or not", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const t = setup({ active: false });
    advance(2999);
    expect(t.ahnaf()).toBe("idle");
    advance(1);
    expect(t.ahnaf()).toBe("blink");
    advance(150);
    expect(t.ahnaf()).toBe("idle");
    advance(2850); // 6000: next blink, 3000 ms after the last one started
    expect(t.ahnaf()).toBe("blink");
  });

  it("the blink interval varies between 3000 and 4000 ms", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.999);
    const t = setup();
    advance(3990);
    expect(t.ahnaf()).toBe("idle");
    advance(10);
    expect(t.ahnaf()).toBe("blink");
  });

  it("only blinks on the idle face", () => {
    const t = setup({ mood: "thinking" });
    for (let i = 0; i < 100; i++) {
      advance(100);
      expect(t.ahnaf()).toBe("thinking");
    }
  });

  it("maps mood to pose; typing (only while active) looks at the prompt with hands moving", () => {
    const t = setup();
    for (const mood of ["idle", "thinking", "happy", "confused"] as const) {
      t.update({ mood });
      expect(t.ahnaf()).toBe(mood);
    }
    t.update({ mood: "typing" });
    expect(t.ahnaf()).toBe("idle");
    t.update({ mood: "typing", active: true });
    expect(t.ahnaf()).toBe("typing");
    const frames = new Set<string>();
    for (let i = 0; i < 6; i++) {
      advance(90);
      frames.add(t.ahnafFrame()!);
    }
    expect([...frames].sort()).toEqual(["0", "1"]);
  });

  it("thinking cycles its thought dots over three frames; happy bounces", () => {
    const t = setup({ mood: "thinking" });
    const seen = [t.ahnafFrame()];
    for (let i = 0; i < 3; i++) {
      advance(400);
      seen.push(t.ahnafFrame());
    }
    expect(seen).toEqual(["0", "1", "2", "0"]);
    t.update({ mood: "happy" });
    expect(t.ahnafFrame()).toBe("0");
    advance(250);
    expect(t.ahnafFrame()).toBe("1");
  });

  it("idle Ahnaf glances aside now and then", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const t = setup();
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) {
      advance(100);
      seen.add(t.ahnaf()!);
    }
    expect(seen).toContain("turn");
    expect(seen).toContain("blink");
  });

  it("the cat starts roaming from mount, inactive: its pose changes within 5 s", () => {
    const t = setup({ active: false });
    const first = t.cat();
    expect(first).toBe("sit");
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) {
      advance(100);
      seen.add(t.cat()!);
    }
    expect([...seen].some((p) => p !== first)).toBe(true);
  });

  it("the cat moves: its transform changes between samples, with a linear transition only while walking", () => {
    const t = setup();
    const transforms = new Set<string>();
    for (let i = 0; i < 300; i++) {
      advance(100);
      const box = t.catBox();
      transforms.add(box.style.transform);
      expect(box.style.transform).toMatch(/^translate\(-?[\d.]+px, -?[\d.]+px\)$/);
      if (t.cat() === "walk") expect(box.style.transition).toMatch(/^transform \d+ms linear$/);
      else if (t.cat() === "hop") expect(box.style.transition).toMatch(/^transform \d+ms linear \d+ms$/);
      else expect(box.style.transition).toBe("");
    }
    expect(transforms.size).toBeGreaterThan(3);
  });

  it("the walk cycles four frames every 150 ms and the cat faces its direction", () => {
    const t = setup();
    for (let i = 0; i < 1000 && t.cat() !== "walk"; i++) advance(10);
    expect(t.cat()).toBe("walk");
    const seen = [t.catSvg().getAttribute("data-frame")];
    for (let i = 0; i < 4; i++) {
      advance(150);
      seen.push(t.catSvg().getAttribute("data-frame"));
    }
    expect(seen).toEqual(["0", "1", "2", "3", "0"]);
    expect(t.catSvg().style.transform).toMatch(/^scaleX\((1|-1)\)$/);
  });

  it("reduceMotion: static idle frames, no roaming, no bob, no blink, zero timers", () => {
    const t = setup({ reduceMotion: true });
    expect(vi.getTimerCount()).toBe(0);
    const before = t.snapshot();
    expect(t.ahnaf()).toBe("idle");
    expect(t.ahnafFrame()).toBe("0");
    expect(t.cat()).toBe("sit");
    t.update({ mood: "thinking" });
    t.update({ mood: "idle" });
    for (let i = 0; i < 600; i++) {
      advance(100);
      expect(t.snapshot()).toBe(before);
    }
    expect(t.catBox().style.transition).toBe("");
    t.update({ active: true });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("switching to reduceMotion mid-walk stops everything and snaps home", () => {
    const t = setup();
    advance(3000);
    t.update({ reduceMotion: true });
    expect(vi.getTimerCount()).toBe(0);
    expect(t.cat()).toBe("sit");
    expect(t.catBox().style.transition).toBe("");
  });

  it("pauses while the document is hidden and resumes when visible", () => {
    const t = setup();
    advance(2000);
    setHidden(true);
    const frozen = t.snapshot();
    for (let i = 0; i < 300; i++) {
      advance(100);
      expect(t.snapshot()).toBe(frozen);
    }
    setHidden(false);
    const after = new Set<string>();
    for (let i = 0; i < 50; i++) {
      advance(100);
      after.add(t.snapshot());
    }
    expect(after.size).toBeGreaterThan(1);
  });

  it("mounting in a hidden tab starts paused", () => {
    hidden = true;
    const t = setup();
    const frozen = t.snapshot();
    advance(20_000);
    expect(t.snapshot()).toBe(frozen);
    setHidden(false);
    advance(1200);
    expect(t.ahnafFrame()).toBe("1");
  });

  it("petTick: purr with hearts in place for 2 s, then roams on", () => {
    const t = setup();
    for (let i = 0; i < 300 && t.cat() !== "walk"; i++) advance(10);
    advance(300); // mid-walk
    t.update({ petTick: 1 });
    expect(t.cat()).toBe("purr");
    const held = t.catBox().style.transform;
    expect(t.catBox().style.transition).toBe("");
    for (let i = 0; i < 19; i++) {
      advance(100);
      expect(t.cat()).toBe("purr");
      expect(t.catBox().style.transform).toBe(held);
    }
    advance(100);
    expect(t.cat()).not.toBe("purr");
  });

  it("purr is state, so it still shows under reduceMotion, and toggling reduceMotion does not cut it off", () => {
    const t = setup({ reduceMotion: true });
    t.update({ petTick: 1 });
    expect(t.cat()).toBe("purr");
    advance(2000);
    expect(t.cat()).toBe("sit");
    t.update({ reduceMotion: false, petTick: 2 });
    advance(500);
    t.update({ reduceMotion: true });
    expect(t.cat()).toBe("purr");
    advance(1499);
    expect(t.cat()).toBe("purr");
    advance(1);
    expect(t.cat()).toBe("sit");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("shades: both wear them; the resting cat shows the shades pose, a walking cat keeps lenses on", () => {
    const t = setup({ shades: true, mood: "happy" });
    expect(t.ahnaf()).toBe("shades");
    expect(t.cat()).toBe("shades");
    t.update({ petTick: 1 });
    expect(t.cat()).toBe("shades");
    for (let i = 0; i < 1000 && t.cat() !== "walk"; i++) advance(10);
    expect(t.ahnaf()).toBe("shades");
    expect(t.cat()).toBe("walk");
    expect(t.catSvg().getAttribute("data-shades")).toBe("true");
  });

  it("over five minutes it naps, yawns, looks, hops (crouching first) and keeps to the edges", () => {
    // a seeded rng and a narrow card, so the long walk is quick and repeatable
    let seed = 7;
    vi.spyOn(Math, "random").mockImplementation(() => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    });
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(160);
    const t = setup();
    const poses = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      advance(300);
      const pose = t.cat()!;
      poses.add(pose);
      if (pose === "hop") expect(t.catBox().style.transition).toMatch(/^transform \d+ms linear 120ms$/);
    }
    for (const p of ["sit", "walk", "sleep", "yawn", "look", "hop"]) expect(poses, p).toContain(p);
  }, 30_000);

  it("every hop step starts with a crouch", () => {
    let seed = 7;
    vi.spyOn(Math, "random").mockImplementation(() => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    });
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(160);
    const t = setup();
    for (let i = 0; i < 2000 && t.cat() !== "hop"; i++) advance(100);
    expect(t.cat()).toBe("hop");
    let steps = 0;
    let last = "";
    for (let i = 0; i < 100 && t.cat() === "hop"; i++) {
      const transform = t.catBox().style.transform;
      if (transform !== last) {
        steps++;
        expect(t.catSvg().getAttribute("data-frame"), `step ${steps}`).toBe("0"); // crouched
        last = transform;
      }
      advance(20);
    }
    expect(steps).toBeGreaterThanOrEqual(2);
  }, 30_000);

  it("when the visitor starts typing, a napping cat wakes with a yawn", () => {
    const t = setup({ active: true });
    for (let i = 0; i < 700 && t.cat() !== "sleep"; i++) advance(100);
    expect(t.cat()).toBe("sleep");
    vi.spyOn(Math, "random").mockReturnValue(0);
    t.update({ mood: "typing" });
    expect(t.cat()).toBe("yawn");
  });

  it("skin swaps both sprites", () => {
    const t = setup();
    const ahnaf = t.ahnafSvg().innerHTML;
    const cat = t.catSvg().innerHTML;
    t.update({ skin: "hacker" });
    expect(t.ahnafSvg().innerHTML).not.toBe(ahnaf);
    expect(t.catSvg().innerHTML).not.toBe(cat);
  });

  it("re-measures the card on resize: a cat far along the top track is pulled in to the new corner", () => {
    const t = setup();
    const x = () => Number(/translate\((-?[\d.]+)px/.exec(t.catBox().style.transform)![1]);
    for (let i = 0; i < 600 && !(x() > 120 && t.cat() !== "walk" && t.cat() !== "hop"); i++) advance(100);
    expect(x()).toBeGreaterThan(120);
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(120);
    act(() => void window.dispatchEvent(new Event("resize")));
    expect(x()).toBeLessThanOrEqual(120 - 16);
  });

  it("Ahnaf keeps breathing through a blink: the breath frame does not reset", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5); // blink at 3500 ms
    const t = setup();
    advance(3600); // breath toggled at 1200, 2400, 3600 → frame 1; blinking since 3500
    expect(t.ahnaf()).toBe("blink");
    expect(t.ahnafFrame()).toBe("1");
    advance(100); // blink over at 3650
    expect(t.ahnaf()).toBe("idle");
    expect(t.ahnafFrame()).toBe("1");
  });

  it("clears every timer and listener on unmount", () => {
    const remove = vi.spyOn(document, "removeEventListener");
    const removeWin = vi.spyOn(window, "removeEventListener");
    const t = setup({ active: true });
    advance(5000);
    t.update({ petTick: 1 });
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    t.unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(remove.mock.calls.some(([type]) => type === "visibilitychange")).toBe(true);
    expect(removeWin.mock.calls.some(([type]) => type === "resize")).toBe(true);
  });
});
