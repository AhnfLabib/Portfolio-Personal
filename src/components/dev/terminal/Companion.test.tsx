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
    cat: () => svg("cat").getAttribute("data-pose"),
    ahnafSvg: () => svg("ahnaf"),
    catBox: () => svg("cat").parentElement as HTMLElement,
    update: (next: Partial<Props>) => {
      props = { ...props, ...next };
      utils.rerender(<Companions {...props} />);
    },
  };
}

const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("Companions", () => {
  it("renders two aria-hidden crisp svgs with the wrapper classes", () => {
    const t = setup();
    const wrapper = t.container.firstElementChild as HTMLElement;
    expect(wrapper.className).toBe("pointer-events-none absolute -top-5 right-6 flex items-end gap-1");
    const svgs = t.container.querySelectorAll("svg");
    expect(svgs).toHaveLength(2);
    for (const s of svgs) {
      expect(s.getAttribute("aria-hidden")).toBe("true");
      expect(s.getAttribute("shape-rendering")).toBe("crispEdges");
      expect(s.getAttribute("viewBox")).toMatch(/^0 0 \d+ \d+$/);
      expect(s.querySelectorAll("rect").length).toBeGreaterThan(0);
    }
    expect(t.ahnafSvg().getAttribute("class")).toBe("h-6 w-auto");
    expect(t.container.querySelector('svg[data-sprite="cat"]')!.getAttribute("class")).toBe("h-4 w-auto");
  });

  it("idle inactive: no blink after 10s", () => {
    const t = setup({ active: false });
    const before = t.ahnafSvg().innerHTML;
    expect(t.ahnaf()).toBe("idle");
    expect(t.cat()).toBe("sleep");
    for (let i = 0; i < 200; i++) {
      advance(50);
      expect(t.ahnaf()).toBe("idle");
      expect(t.cat()).toBe("sleep");
    }
    expect(t.ahnafSvg().innerHTML).toBe(before);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("active: blinks at 4s for 150ms", () => {
    const t = setup({ active: true });
    advance(3999);
    expect(t.ahnaf()).toBe("idle");
    advance(1);
    expect(t.ahnaf()).toBe("blink");
    advance(149);
    expect(t.ahnaf()).toBe("blink");
    advance(51); // 4200ms
    expect(t.ahnaf()).toBe("idle");
    advance(3800); // 8000ms: next cycle
    expect(t.ahnaf()).toBe("blink");
  });

  it("only blinks while mood is idle", () => {
    const t = setup({ active: true, mood: "typing" });
    advance(4000);
    expect(t.ahnaf()).toBe("typing");
  });

  it("maps mood to pose", () => {
    const t = setup();
    for (const mood of ["idle", "typing", "thinking", "happy", "confused"] as const) {
      t.update({ mood });
      expect(t.ahnaf()).toBe(mood);
    }
  });

  it("cat stretches for 800ms on the rising edge of active, then is awake", () => {
    const t = setup({ active: false });
    t.update({ active: true });
    expect(t.cat()).toBe("stretch");
    advance(799);
    expect(t.cat()).toBe("stretch");
    advance(1);
    expect(t.cat()).toBe("awake");
    t.update({ active: false });
    expect(t.cat()).toBe("sleep");
  });

  it("cat walks once per 30s of active time, alternating frames, out and back within 3s", () => {
    const t = setup({ active: true });
    advance(29_999);
    expect(t.cat()).toBe("awake");
    expect(t.catBox().style.transition).toBe("transform 1500ms linear");
    advance(1); // 30 000
    expect(t.cat()).toBe("walk1");
    const seen: string[] = [];
    for (let i = 0; i < 19; i++) {
      advance(150);
      seen.push(t.cat()!);
    }
    // 150 ms steps inside the 3000 ms walk alternate walk2/walk1
    expect(seen.slice(0, 4)).toEqual(["walk2", "walk1", "walk2", "walk1"]);
    expect(seen.every((p) => p === "walk1" || p === "walk2")).toBe(true);
    advance(150); // 33 000
    expect(t.cat()).toBe("awake");
    expect(t.catBox().style.transform).toBe("translateX(0px)");
    advance(26_999);
    expect(t.cat()).toBe("awake");
    advance(1); // 60 000
    expect(t.cat()).toBe("walk1");
  });

  it("reduceMotion: never blinks, never walks", () => {
    const t = setup({ active: false, reduceMotion: true });
    t.update({ active: true });
    for (let i = 0; i < 1300; i++) {
      advance(50);
      expect(t.ahnaf()).toBe("idle");
      expect(t.cat()).toBe("awake");
    }
    expect(t.catBox().style.transition).toBe("");
    expect(t.catBox().style.transform).toBe("translateX(0px)");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("shades prop overrides pose", () => {
    const t = setup({ active: true, shades: true, mood: "happy" });
    expect(t.ahnaf()).toBe("shades");
    expect(t.cat()).toBe("shades");
    advance(4000);
    expect(t.ahnaf()).toBe("shades");
    t.update({ petTick: 1 });
    expect(t.cat()).toBe("shades");
  });

  it("petTick change shows purr for 2s", () => {
    const t = setup({ active: true });
    advance(1000);
    expect(t.cat()).toBe("awake");
    t.update({ petTick: 1 });
    expect(t.cat()).toBe("purr");
    advance(1999);
    expect(t.cat()).toBe("purr");
    advance(1);
    expect(t.cat()).toBe("awake");
  });

  it("purr is state, so it still shows under reduceMotion", () => {
    const t = setup({ active: true, reduceMotion: true });
    t.update({ petTick: 1 });
    expect(t.cat()).toBe("purr");
    advance(2000);
    expect(t.cat()).toBe("awake");
  });

  it("skin swaps both sprites", () => {
    const t = setup();
    const ahnaf = t.ahnafSvg().innerHTML;
    const cat = t.container.querySelector('svg[data-sprite="cat"]')!.innerHTML;
    t.update({ skin: "hacker" });
    expect(t.ahnafSvg().innerHTML).not.toBe(ahnaf);
    expect(t.container.querySelector('svg[data-sprite="cat"]')!.innerHTML).not.toBe(cat);
  });

  it("clears every timer when active goes false and on unmount", () => {
    const t = setup({ active: true });
    advance(30_100); // mid-walk, blink cycle running
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    t.update({ active: false });
    expect(vi.getTimerCount()).toBe(0);
    expect(t.cat()).toBe("sleep");
    expect(t.ahnaf()).toBe("idle");
    expect(t.catBox().style.transform).toBe("translateX(0px)");

    t.update({ active: true, petTick: 1 });
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    t.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
