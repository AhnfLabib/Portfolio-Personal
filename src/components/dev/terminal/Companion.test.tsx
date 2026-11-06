import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act, cleanup as cleanupAll, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { Companions } from "./Companion";

type Props = ComponentProps<typeof Companions>;
const base: Props = { skin: "default", shades: false, petTick: 0, reduceMotion: false, thinking: false, frozen: false, onPlay: () => {} };

function setup(overrides: Partial<Props> = {}) {
  let props: Props = { ...base, ...overrides };
  const utils = render(<Companions {...props} />);
  const svg = () => utils.container.querySelector('svg[data-sprite="cat"]') as SVGSVGElement;
  const button = () => utils.getByRole("button", { name: "the cat" });
  return {
    ...utils,
    cat: () => svg().getAttribute("data-pose"),
    catSvg: svg,
    button,
    catBox: () => button().parentElement as HTMLElement,
    bubble: () => utils.container.querySelector("[data-bubble]")?.textContent ?? null,
    menu: () => utils.queryByRole("menu", { name: "cat menu" }),
    item: (name: string) => utils.getByRole("menuitem", { name }),
    snapshot: () => [svg().getAttribute("data-pose"), svg().getAttribute("data-frame"), (button().parentElement as HTMLElement).style.transform, svg().style.transform].join("|"),
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

/** The cat's on-screen box (jsdom has no layout): 32 px square at (300, 100). */
const CAT_RECT = { x: 300, y: 100, w: 32, h: 32 };
let canHover = true;
function stubMatchMedia() {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === "(hover: hover)" ? canHover : false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
}
/** Move the pointer to (x, y) and let the throttling frame run. */
function pointer(x: number, y: number) {
  act(() => void window.dispatchEvent(new MouseEvent("pointermove", { clientX: x, clientY: y })));
  advance(20);
}
/** A repeatable Math.random: the Park–Miller minimal standard generator from `seed`. */
function seedRandom(seed: number) {
  let state = seed;
  vi.spyOn(Math, "random").mockImplementation(() => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  });
}
const pointerListeners = (spy: { mock: { calls: unknown[][] } }) => spy.mock.calls.filter(([type]) => type === "pointermove").length;

beforeEach(() => {
  vi.useFakeTimers();
  hidden = false;
  canHover = true;
  stubMatchMedia();
  vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
  // jsdom has no layout: give the card a desktop-sized box so the cat has room to roam
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(576);
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(175);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    x: CAT_RECT.x, y: CAT_RECT.y, left: CAT_RECT.x, top: CAT_RECT.y, width: CAT_RECT.w, height: CAT_RECT.h,
    right: CAT_RECT.x + CAT_RECT.w, bottom: CAT_RECT.y + CAT_RECT.h, toJSON: () => ({}),
  } as DOMRect);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Companions", () => {
  it("renders only the cat: one aria-hidden crisp 40 px svg in a labelled button that opts back into pointer events", () => {
    const t = setup();
    const wrapper = t.container.firstElementChild as HTMLElement;
    expect(wrapper.className).toBe("pointer-events-none absolute inset-0");
    expect(t.container.querySelector('svg[data-sprite="ahnaf"]')).toBeNull();
    const svgs = t.container.querySelectorAll("svg");
    expect(svgs).toHaveLength(1);
    const button = t.button();
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveClass("pointer-events-auto");
    expect(button).toContainElement(svgs[0] as unknown as HTMLElement);
    for (const s of svgs) {
      expect(s.getAttribute("aria-hidden")).toBe("true");
      expect(s.getAttribute("shape-rendering")).toBe("crispEdges");
      expect(s.getAttribute("viewBox")).toMatch(/^0 0 \d+ \d+$/);
      expect(s.querySelectorAll("rect").length).toBeGreaterThan(0);
    }
    expect(t.catSvg().getAttribute("class")).toContain("h-10"); // 40 px
  });

  it("the cat starts roaming from mount: its pose changes within 5 s", () => {
    const t = setup();
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

  it("reduceMotion: a static frame, no roaming, zero timers", () => {
    const t = setup({ reduceMotion: true });
    expect(vi.getTimerCount()).toBe(0);
    const before = t.snapshot();
    expect(t.cat()).toBe("sit");
    for (let i = 0; i < 600; i++) {
      advance(100);
      expect(t.snapshot()).toBe(before);
    }
    expect(t.catBox().style.transition).toBe("");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("frozen (the game is open): it holds the sit pose in place, ignores the cursor and never chatters; unfrozen it wanders on", () => {
    const t = setup();
    for (let i = 0; i < 300 && t.cat() !== "walk"; i++) advance(10);
    expect(t.cat()).toBe("walk");
    t.update({ frozen: true });
    for (let i = 0; i < 100 && t.cat() !== "sit"; i++) advance(10); // a hop in mid-air lands first
    expect(t.cat()).toBe("sit");
    const held = t.snapshot();
    pointer(CAT_RECT.x - 10, CAT_RECT.y + 16); // right next to it
    for (let i = 0; i < 300; i++) {
      advance(100);
      expect(t.snapshot()).toBe(held);
      expect(t.bubble()).toBeNull();
    }
    pointer(CAT_RECT.x - 2000, CAT_RECT.y);
    t.update({ frozen: false });
    const after = new Set<string>();
    for (let i = 0; i < 100; i++) {
      advance(100);
      after.add(t.snapshot());
    }
    expect(after.size).toBeGreaterThan(1);
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
    const after = new Set<string>();
    for (let i = 0; i < 50; i++) {
      advance(100);
      after.add(t.snapshot());
    }
    expect(after.size).toBeGreaterThan(1);
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

  it("shades: the resting cat shows the shades pose, a walking cat keeps lenses on", () => {
    const t = setup({ shades: true });
    expect(t.cat()).toBe("shades");
    t.update({ petTick: 1 });
    expect(t.cat()).toBe("shades");
    for (let i = 0; i < 1000 && t.cat() !== "walk"; i++) advance(10);
    expect(t.cat()).toBe("walk");
    expect(t.catSvg().getAttribute("data-shades")).toBe("true");
  });

  it("over five minutes it naps, yawns, looks, hops (crouching first) and keeps to the edges", () => {
    // a seeded rng and a narrow card, so the long walk is quick and repeatable
    seedRandom(7);
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
    seedRandom(7);
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

  it("a game opened mid-hop lets the hop play out: the cat leaves the crouch in the air", () => {
    seedRandom(7);
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(160);
    const t = setup();
    for (let i = 0; i < 2000 && t.cat() !== "hop"; i++) advance(100);
    expect(t.cat()).toBe("hop");
    t.update({ frozen: true });
    const frames = new Set<string>();
    for (let i = 0; i < 100 && t.cat() === "hop"; i++) {
      frames.add(t.catSvg().getAttribute("data-frame")!);
      advance(20);
    }
    expect([...frames].some((f) => f !== "0")).toBe(true);
    for (let i = 0; i < 100 && t.cat() !== "sit"; i++) advance(20);
    expect(t.cat()).toBe("sit"); // then it sits for the game
  }, 30_000);

  it("skin swaps the cat's sprite", () => {
    const t = setup();
    const cat = t.catSvg().innerHTML;
    t.update({ skin: "hacker" });
    expect(t.catSvg().innerHTML).not.toBe(cat);
  });

  it("re-measures the card on resize: a cat far along the top track is pulled in to the new corner", () => {
    seedRandom(7);
    const t = setup();
    const x = () => Number(/translate\((-?[\d.]+)px/.exec(t.catBox().style.transform)![1]);
    for (let i = 0; i < 600 && !(x() > 120 && t.cat() !== "walk" && t.cat() !== "hop"); i++) advance(100);
    expect(x()).toBeGreaterThan(120);
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(120);
    act(() => void window.dispatchEvent(new Event("resize")));
    expect(x()).toBeLessThanOrEqual(120 - 16);
  });

  it("clears every timer and listener on unmount", () => {
    const remove = vi.spyOn(document, "removeEventListener");
    const removeWin = vi.spyOn(window, "removeEventListener");
    const add = vi.spyOn(window, "addEventListener");
    const t = setup();
    advance(5000);
    pointer(CAT_RECT.x - 60, CAT_RECT.y + 16); // near: chatter and tracking timers armed
    t.update({ petTick: 1 });
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    t.unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(remove.mock.calls.some(([type]) => type === "visibilitychange")).toBe(true);
    expect(removeWin.mock.calls.some(([type]) => type === "resize")).toBe(true);
    expect(pointerListeners(add)).toBe(1);
    expect(pointerListeners(removeWin)).toBe(1);
    expect(removeWin.mock.calls.find(([type]) => type === "pointermove")![1]).toBe(add.mock.calls.find(([type]) => type === "pointermove")![1]);
  });

  describe("the cursor nearby", () => {
    it("listens to pointermove on window, passively, only where the pointer can hover and motion is allowed", () => {
      const add = vi.spyOn(window, "addEventListener");
      const t = setup();
      const call = add.mock.calls.find(([type]) => type === "pointermove")!;
      expect(call[2]).toMatchObject({ passive: true });
      t.unmount();
      add.mockClear();
      setup({ reduceMotion: true });
      expect(pointerListeners(add)).toBe(0);
      cleanupAll();
      canHover = false; // touch-only
      add.mockClear();
      setup();
      expect(pointerListeners(add)).toBe(0);
    });

    it("near (< 120 px): the cat stops and looks toward the cursor, flipping sides with it; far again: it walks on after 1–2 s", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      const t = setup();
      for (let i = 0; i < 1000 && t.cat() !== "walk"; i++) advance(10);
      expect(t.cat()).toBe("walk");
      pointer(CAT_RECT.x + CAT_RECT.w + 100, CAT_RECT.y + 16); // 100 px to the right
      expect(t.cat()).toBe("look-r");
      expect(t.catBox().style.transition).toBe(""); // stopped where it was
      const held = t.catBox().style.transform;
      advance(20_000); // attending holds indefinitely
      expect(t.catBox().style.transform).toBe(held);
      expect(t.cat()).toBe("look-r");
      pointer(CAT_RECT.x - 80, CAT_RECT.y + 16); // to the left
      expect(t.cat()).toBe("look-l");
      expect(t.catSvg().style.transform).toBe("scaleX(1)"); // look-l is drawn mirrored already
      pointer(CAT_RECT.x + 16, CAT_RECT.y - 60); // well above
      expect(t.cat()).toBe("look-up");
      pointer(CAT_RECT.x + 16, CAT_RECT.y - 130); // gone: far
      expect(t.cat()).toBe("look-up");
      advance(999);
      expect(t.catBox().style.transform).toBe(held);
      expect(t.cat()).toBe("look-up");
      advance(1100); // 1–2 s later it wanders on
      expect(["walk", "sleep"]).toContain(t.cat());
    });

    it("the pointer leaving the window while near counts as far: it walks on after 1–2 s, chatter stops", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      const t = setup();
      advance(100);
      pointer(CAT_RECT.x + CAT_RECT.w + 100, CAT_RECT.y + 16); // near
      expect(t.cat()).toBe("look-r");
      act(() => void document.dispatchEvent(new MouseEvent("pointerout", { relatedTarget: null })));
      advance(2100);
      expect(t.cat()).not.toMatch(/^look-/);
      advance(30_000);
      expect(t.bubble()).toBeNull(); // no chatter once it has left
    });

    it("the game closing with the cursor still near: chatter starts again within the usual interval", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      const t = setup();
      advance(100);
      pointer(CAT_RECT.x + CAT_RECT.w + 100, CAT_RECT.y + 16); // near
      expect(t.cat()).toBe("look-r");
      t.update({ frozen: true });
      advance(1000);
      t.update({ frozen: false });
      let spoke = false;
      for (let i = 0; i < 100 && !spoke; i++) {
        advance(100); // up to 10 s, the longest chatter gap
        spoke = t.bubble() !== null;
      }
      expect(spoke).toBe(true);
    });

    it("a pointerout into another element (relatedTarget set) is not leaving the window", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      const t = setup();
      advance(100);
      pointer(CAT_RECT.x + CAT_RECT.w + 100, CAT_RECT.y + 16);
      act(() => void document.dispatchEvent(new MouseEvent("pointerout", { relatedTarget: document.body })));
      advance(20_000);
      expect(t.cat()).toBe("look-r");
    });

    it("close (< 40 px): at most two 8 px steps toward the cursor, then a 300 ms paw swipe at most every 2 s", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      const t = setup();
      advance(100);
      const x = () => Number(/translate\((-?[\d.]+)px/.exec(t.catBox().style.transform)![1]);
      pointer(CAT_RECT.x + CAT_RECT.w + 80, CAT_RECT.y + 16); // near first
      const x0 = x();
      pointer(CAT_RECT.x + CAT_RECT.w + 30, CAT_RECT.y + 16); // close, to the right
      expect(t.cat()).toBe("walk");
      expect(x()).toBe(x0 + 8);
      expect(t.catBox().style.transition).toMatch(/^transform \d+ms linear$/);
      advance(300);
      pointer(CAT_RECT.x + CAT_RECT.w + 31, CAT_RECT.y + 16);
      expect(x()).toBe(x0 + 16);
      advance(300);
      pointer(CAT_RECT.x + CAT_RECT.w + 30, CAT_RECT.y + 16);
      expect(x()).toBe(x0 + 16); // no third step
      expect(t.cat()).toBe("paw");
      advance(300);
      expect(t.cat()).toBe("look-r");
      pointer(CAT_RECT.x + CAT_RECT.w + 31, CAT_RECT.y + 16);
      expect(t.cat()).toBe("look-r"); // paw cooling down
      advance(1700);
      pointer(CAT_RECT.x + CAT_RECT.w + 30, CAT_RECT.y + 16);
      expect(t.cat()).toBe("paw");
    });

    it("while near, a bubble says meow / mrrp / ... / ? every 4–10 s and hides after 1.5 s; none once the cursor leaves", () => {
      vi.spyOn(Math, "random").mockReturnValue(0);
      const t = setup();
      pointer(CAT_RECT.x - 100, CAT_RECT.y);
      expect(t.bubble()).toBeNull();
      advance(3900);
      expect(t.bubble()).toBeNull();
      advance(200); // 4000 ms after the cursor came near
      expect(t.bubble()).toBe("meow");
      const el = t.container.querySelector("[data-bubble]")!;
      expect(el).toHaveAttribute("aria-hidden", "true");
      expect(el).toHaveClass("font-mono", "text-[10px]", "bg-surface", "text-ink", "border", "border-line");
      advance(1300);
      expect(t.bubble()).toBe("meow");
      advance(100); // 1500 ms after it appeared
      expect(t.bubble()).toBeNull();
      advance(2500); // the next one, 4000 ms after the last
      expect(t.bubble()).toBe("meow");
      advance(1300);
      expect(t.bubble()).toBe("meow");
      pointer(CAT_RECT.x - 500, CAT_RECT.y); // far: the bubble goes with the cursor
      expect(t.bubble()).toBeNull();
      advance(30_000);
      expect(t.bubble()).toBeNull();
    });

    it("the bubble words are the four from the spec, timed between 4 and 10 s", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.999);
      const t = setup();
      pointer(CAT_RECT.x - 100, CAT_RECT.y);
      advance(9900);
      expect(t.bubble()).toBeNull();
      advance(100);
      expect(t.bubble()).toBe("?");
    });

    it("ignores touch pointers and stops tracking under reduceMotion", () => {
      const t = setup();
      act(() => void window.dispatchEvent(Object.assign(new MouseEvent("pointermove", { clientX: CAT_RECT.x - 10, clientY: CAT_RECT.y }), { pointerType: "touch" })));
      advance(20);
      expect(t.cat()).not.toMatch(/^look-/);
      t.update({ reduceMotion: true });
      pointer(CAT_RECT.x - 10, CAT_RECT.y);
      expect(t.cat()).toBe("sit");
    });
  });

  describe("thinking (an ask in flight)", () => {
    it("the cat stops, faces the prompt (left) and thinks, the dots cycling every 400 ms, ignoring the cursor", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      const t = setup();
      for (let i = 0; i < 1000 && t.cat() !== "walk"; i++) advance(10);
      t.update({ thinking: true });
      expect(t.cat()).toBe("think");
      expect(t.catSvg().style.transform).toBe("scaleX(-1)");
      expect(t.catBox().style.transition).toBe("");
      const held = t.catBox().style.transform;
      const frames = [t.catSvg().getAttribute("data-frame")];
      for (let i = 0; i < 3; i++) {
        advance(400);
        frames.push(t.catSvg().getAttribute("data-frame"));
      }
      expect(frames).toEqual(["0", "1", "2", "0"]);
      pointer(CAT_RECT.x + CAT_RECT.w + 30, CAT_RECT.y + 16); // close, to the right
      advance(30_000);
      expect(t.cat()).toBe("think");
      expect(t.catSvg().style.transform).toBe("scaleX(-1)");
      expect(t.catBox().style.transform).toBe(held);
      expect(t.bubble()).toBeNull(); // no chatter while thinking
    });

    it("a failed ask ends without the happy beat", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      const t = setup({ thinking: true });
      advance(2000);
      t.update({ thinking: false, askOutcome: "fail" });
      expect(t.cat()).not.toBe("happy");
      expect(t.cat()).not.toBe("think");
      const seen = new Set<string>();
      for (let i = 0; i < 30; i++) {
        advance(100);
        seen.add(t.cat()!);
      }
      expect(seen.has("happy") || seen.has("think")).toBe(false);
      expect(seen).toContain("walk"); // it wanders on after the beat
    });

    it("leaving think with the cursor still near: it keeps attending instead of walking off", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      const t = setup();
      pointer(CAT_RECT.x + CAT_RECT.w + 80, CAT_RECT.y + 16); // near, right
      t.update({ thinking: true });
      advance(3000);
      t.update({ thinking: false, askOutcome: "ok" });
      expect(t.cat()).toBe("happy");
      const held = t.catBox().style.transform;
      advance(1000);
      expect(t.cat()).toBe("look-r");
      advance(20_000);
      expect(t.cat()).toMatch(/^look-|^paw$/);
      expect(t.catBox().style.transform).toBe(held);
    });

    it("leaving think after the cursor's spot became far (layout moved): no chatter, it wanders on", () => {
      vi.spyOn(Math, "random").mockReturnValue(0);
      const t = setup();
      pointer(CAT_RECT.x - 100, CAT_RECT.y); // near
      t.update({ thinking: true });
      advance(2000);
      // the cat's box moves far from the resting cursor without a pointer move
      vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
        x: 900, y: 600, left: 900, top: 600, width: 40, height: 40, right: 940, bottom: 640, toJSON: () => ({}),
      } as DOMRect);
      t.update({ thinking: false, askOutcome: "ok" });
      for (let i = 0; i < 300; i++) {
        advance(100);
        expect(t.bubble()).toBeNull();
      }
      expect(t.cat()).not.toMatch(/^look-/);
    });

    it("when the answer lands: a 1 s happy beat, then it wanders on", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      const t = setup({ thinking: true });
      advance(5000);
      expect(t.cat()).toBe("think");
      t.update({ thinking: false, askOutcome: "ok" });
      expect(t.cat()).toBe("happy");
      advance(999);
      expect(t.cat()).toBe("happy");
      advance(1);
      expect(t.cat()).not.toBe("happy");
      advance(100);
      expect(["walk", "sleep"]).toContain(t.cat());
    });

    it("a hop in mid-air lands first, then the cat thinks", () => {
      seedRandom(7);
      vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(160);
      const t = setup();
      for (let i = 0; i < 2000 && t.cat() !== "hop"; i++) advance(100);
      expect(t.cat()).toBe("hop");
      t.update({ thinking: true });
      expect(t.cat()).toBe("hop");
      advance(2000);
      expect(t.cat()).toBe("think");
      const held = t.catBox().style.transform;
      advance(20_000);
      expect(t.catBox().style.transform).toBe(held);
    }, 30_000);

    it("under reduceMotion it still thinks (a static frame), facing left", () => {
      const t = setup({ reduceMotion: true, thinking: true });
      expect(t.cat()).toBe("think");
      expect(t.catSvg().style.transform).toBe("scaleX(-1)");
    });
  });

  describe("love (loveTick)", () => {
    it("a loveTick change shows the love pose for 4 s and a ♥ bubble for 1.5 s", () => {
      const t = setup();
      t.update({ loveTick: 1 });
      expect(t.cat()).toBe("love");
      expect(t.bubble()).toBe("♥");
      advance(1500);
      expect(t.bubble()).toBeNull();
      expect(t.cat()).toBe("love");
      advance(2499);
      expect(t.cat()).toBe("love");
      advance(1);
      expect(t.cat()).not.toBe("love");
    });

    it("the ♥ bubble outlasts the cursor leaving and is not overwritten by chatter", () => {
      vi.spyOn(Math, "random").mockReturnValue(0);
      const t = setup();
      pointer(CAT_RECT.x - 100, CAT_RECT.y); // near: chatter armed for 4 s
      advance(3000);
      t.update({ loveTick: 1 });
      expect(t.bubble()).toBe("♥");
      advance(1100); // chatter fires mid-heart
      expect(t.bubble()).toBe("♥");
      pointer(CAT_RECT.x - 500, CAT_RECT.y); // far
      expect(t.bubble()).toBe("♥");
      advance(400); // past 1500 ms after the heart appeared
      expect(t.bubble()).toBeNull();
    });

    it("does not fire on mount", () => {
      const t = setup({ loveTick: 3 });
      expect(t.cat()).toBe("sit");
      expect(t.bubble()).toBeNull();
    });
  });

  describe("clicking the cat: the menu", () => {
    it("a click opens the menu (the cat looks up, no bubble) with the first item focused", () => {
      const t = setup();
      expect(t.menu()).toBeNull();
      fireEvent.click(t.button());
      expect(t.menu()).not.toBeNull();
      expect(t.cat()).toBe("look-up");
      expect(t.bubble()).toBeNull();
      expect(t.item("play a game")).toHaveFocus();
      // inside the [data-cat] subtree, so the terminal's focus/click guards ignore it
      expect(t.menu()!.closest("[data-cat]")).not.toBeNull();
      expect(t.button().closest("[data-cat]")).not.toBeNull();
    });

    it("pet closes the menu and purrs with a ♥", () => {
      const t = setup();
      fireEvent.click(t.button());
      fireEvent.click(t.item("pet"));
      expect(t.menu()).toBeNull();
      expect(t.cat()).toBe("purr");
      expect(t.bubble()).toBe("♥");
      expect(t.button()).toHaveFocus();
      advance(2000);
      expect(t.cat()).not.toBe("purr");
    });

    it("nope closes the menu and slow-blinks", () => {
      const t = setup();
      fireEvent.click(t.button());
      fireEvent.click(t.item("nope"));
      expect(t.menu()).toBeNull();
      expect(t.cat()).toBe("slow-blink");
      advance(1500);
      expect(t.cat()).not.toBe("slow-blink");
    });

    it("play a game closes the menu and calls onPlay", () => {
      const onPlay = vi.fn();
      const t = setup({ onPlay });
      fireEvent.click(t.button());
      fireEvent.click(t.item("play a game"));
      expect(onPlay).toHaveBeenCalledTimes(1);
      expect(t.menu()).toBeNull();
    });

    it("Escape closes the menu and focuses the cat", () => {
      const t = setup();
      fireEvent.click(t.button());
      fireEvent.keyDown(t.item("play a game"), { key: "Escape" });
      expect(t.menu()).toBeNull();
      expect(t.button()).toHaveFocus();
    });

    it("clicking the cat again closes it; a pointerdown outside closes it too", () => {
      const t = setup();
      fireEvent.click(t.button());
      fireEvent.pointerDown(t.button()); // the cat's own press is not "outside"
      expect(t.menu()).not.toBeNull();
      fireEvent.click(t.button());
      expect(t.menu()).toBeNull();
      fireEvent.click(t.button());
      fireEvent.pointerDown(document.body);
      expect(t.menu()).toBeNull();
    });

    it("while open the cat neither wanders nor chatters, and holds look-up; it wanders on after", () => {
      vi.spyOn(Math, "random").mockReturnValue(0);
      const t = setup();
      fireEvent.click(t.button());
      const held = t.catBox().style.transform;
      pointer(CAT_RECT.x - 100, CAT_RECT.y); // near: chatter would start
      advance(20_000);
      expect(t.catBox().style.transform).toBe(held);
      expect(t.bubble()).toBeNull();
      expect(t.cat()).toBe("look-up");
      pointer(CAT_RECT.x - 500, CAT_RECT.y); // far
      fireEvent.keyDown(t.item("play a game"), { key: "Escape" });
      expect(t.cat()).not.toBe("look-up");
      advance(20_000);
      expect(t.catBox().style.transform).not.toBe(held);
    }, 30_000);

    it("neither the cat's click nor the menu's reaches the card", () => {
      const outer = vi.fn();
      const t = render(
        <div onClick={outer}>
          <Companions {...base} />
        </div>,
      );
      fireEvent.click(t.getByRole("button", { name: "the cat" }));
      fireEvent.click(t.getByRole("menuitem", { name: "nope" }));
      expect(outer).not.toHaveBeenCalled();
    });

    it("Enter and Space on the focused cat open and close the menu", async () => {
      vi.useRealTimers();
      const user = userEvent.setup();
      const t = setup();
      t.button().focus();
      await user.keyboard("{Enter}");
      expect(t.menu()).not.toBeNull();
      expect(t.item("play a game")).toHaveFocus();
      await user.keyboard("{Escape}");
      expect(t.button()).toHaveFocus();
      await user.keyboard(" ");
      expect(t.menu()).not.toBeNull();
      await user.keyboard("{ArrowDown}{Enter}"); // pet
      expect(t.menu()).toBeNull();
      expect(t.cat()).toBe("purr");
    });

    describe("placement: on the card, clear of its ends and its top", () => {
      const at = (t: ReturnType<typeof setup>) => {
        const [, x, y] = /translate\((-?[\d.]+)px, (-?[\d.]+)px\)/.exec(t.catBox().style.transform)!.map(Number);
        return { x, y };
      };
      const anchor = (t: ReturnType<typeof setup>) => t.menu()!.parentElement as HTMLElement;
      /** Let the cat roam (deterministically) until it rests where `where` says, then open the menu. */
      const openWhere = (where: (p: { x: number; y: number }) => boolean) => {
        vi.spyOn(Math, "random").mockReturnValue(0);
        const t = setup();
        for (let i = 0; i < 3000 && !(where(at(t)) && t.cat() !== "walk" && t.cat() !== "hop"); i++) advance(100);
        expect(where(at(t))).toBe(true);
        fireEvent.click(t.button());
        return t;
      };

      it("at the start of the top track: below the cat, lined up with its left", () => {
        const t = setup();
        fireEvent.click(t.button());
        expect(at(t)).toEqual({ x: 16, y: -40 });
        expect(anchor(t)).toHaveAttribute("data-menu-align", "left");
        expect(anchor(t)).toHaveAttribute("data-menu-side", "bottom");
        expect(anchor(t)).toHaveClass("top-full", "left-0");
        expect(anchor(t)).not.toHaveClass("-translate-x-1/2");
      });

      it("along the top track: below the cat, centred", () => {
        const t = openWhere(({ x, y }) => y < 0 && x >= 50 && x <= 576 - 50);
        expect(anchor(t)).toHaveAttribute("data-menu-align", "center");
        expect(anchor(t)).toHaveAttribute("data-menu-side", "bottom");
        expect(anchor(t)).toHaveClass("top-full", "left-1/2", "-translate-x-1/2");
      });

      it("on the right edge: above the cat, lined up with its right", () => {
        const t = openWhere(({ x, y }) => y >= 0 && x > 576 - 50);
        expect(anchor(t)).toHaveAttribute("data-menu-align", "right");
        expect(anchor(t)).toHaveAttribute("data-menu-side", "top");
        expect(anchor(t)).toHaveClass("bottom-full", "right-0");
      });

      it("along the bottom edge: above the cat, centred", () => {
        const t = openWhere(({ x, y }) => y > 100 && x >= 50 && x <= 576 - 50);
        expect(anchor(t)).toHaveAttribute("data-menu-align", "center");
        expect(anchor(t)).toHaveAttribute("data-menu-side", "top");
        expect(anchor(t)).toHaveClass("bottom-full");
      });
    });

    it("under reduceMotion the menu still opens and the cat looks up", () => {
      const t = setup({ reduceMotion: true });
      fireEvent.click(t.button());
      expect(t.cat()).toBe("look-up");
      fireEvent.click(t.item("nope"));
      expect(t.cat()).toBe("slow-blink");
    });
  });
});
