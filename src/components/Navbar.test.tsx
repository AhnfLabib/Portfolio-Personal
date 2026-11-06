import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render } from "@testing-library/react";
import Navbar from "./Navbar";
import { PersonaProvider } from "../persona/PersonaContext";
import { navCreative } from "../data/content";

// Records every element the scroll-spy observes, and lets a test fire an
// intersection for one of them.
const observed: Element[] = [];
let fire: ((target: Element) => void) | null = null;

class FakeObserver {
  constructor(cb: IntersectionObserverCallback) {
    fire = (target) =>
      cb([{ target, isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
  observe(el: Element) {
    observed.push(el);
  }
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

beforeEach(() => {
  observed.length = 0;
  fire = null;
  vi.stubGlobal("IntersectionObserver", FakeObserver);
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })),
  );
  localStorage.setItem("portfolio-persona", "creative");
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  document.querySelectorAll("section[data-late]").forEach((el) => el.remove());
});

describe("Navbar scroll-spy", () => {
  // The persona pages are lazy chunks, so their sections mount after the
  // Navbar. The spy must pick them up when they arrive.
  it("observes sections that mount after the navbar and marks the current one", async () => {
    const { container } = render(
      <PersonaProvider>
        <Navbar />
      </PersonaProvider>,
    );
    expect(observed).toHaveLength(0);

    await act(async () => {
      for (const item of navCreative) {
        const section = document.createElement("section");
        section.id = item.href.slice(1);
        section.dataset.late = "";
        document.body.appendChild(section);
      }
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(observed.map((el) => el.id)).toEqual(navCreative.map((item) => item.href.slice(1)));

    const target = observed[1];
    act(() => fire?.(target));
    const current = container.querySelector('a[aria-current="true"]');
    expect(current?.getAttribute("href")).toBe(`#${target.id}`);
  });
});
