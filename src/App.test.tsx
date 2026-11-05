import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";

// Each persona module is replaced by a stub whose render is a spy, and whose
// factory counts that the module was loaded at all. With React.lazy, the
// factory only runs when App actually imports that persona's chunk. The count
// is a plain object, not a vi.fn: Vitest clears mock call history before each
// test (clearMocks defaults to true), which would hide an import-time load.
const mocks = vi.hoisted(() => ({
  loaded: { dev: 0, creative: 0 },
  devRender: vi.fn(() => <div data-testid="dev-persona" />),
  creativeRender: vi.fn(() => <div data-testid="creative-persona" />),
}));

vi.mock("./components/dev/DevPortfolio", () => {
  mocks.loaded.dev += 1;
  return { default: mocks.devRender };
});

vi.mock("./components/creative/CreativePortfolio", () => {
  mocks.loaded.creative += 1;
  return { default: mocks.creativeRender };
});

class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

function stubMatchMedia(reduced: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: reduced && query.includes("reduce"),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })),
  );
}

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", NoopObserver);
  vi.stubGlobal("scrollTo", vi.fn());
  stubMatchMedia(false);
  sessionStorage.setItem("intro-played", "1");
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  sessionStorage.clear();
});

describe("App persona code split", () => {
  // Order matters: module mocks are cached once loaded, so the creative-only
  // case runs first while the dev module has never been imported.
  it("renders only the creative persona when it is stored, without loading the dev module", async () => {
    localStorage.setItem("portfolio-persona", "creative");
    const { container } = render(<App />);
    // While the chunk loads, a screen-tall placeholder keeps the footer below
    // the fold, so it does not jump down when the persona arrives (CLS).
    const placeholder = container.querySelector("[data-persona-loading]");
    expect(placeholder).not.toBeNull();
    expect(placeholder).toHaveClass("min-h-svh");
    expect(await screen.findByTestId("creative-persona")).toBeInTheDocument();
    expect(container.querySelector("[data-persona-loading]")).toBeNull();
    expect(mocks.creativeRender).toHaveBeenCalled();
    expect(mocks.devRender).not.toHaveBeenCalled();
    expect(mocks.loaded.creative).toBe(1);
    expect(mocks.loaded.dev).toBe(0);
    expect(screen.queryByTestId("dev-persona")).not.toBeInTheDocument();
  });

  it("renders only the dev persona by default", async () => {
    render(<App />);
    expect(await screen.findByTestId("dev-persona")).toBeInTheDocument();
    expect(mocks.devRender).toHaveBeenCalled();
    expect(mocks.creativeRender).not.toHaveBeenCalled();
    expect(screen.queryByTestId("creative-persona")).not.toBeInTheDocument();
  });

  it("still plays the intro loader on a first visit", async () => {
    sessionStorage.removeItem("intro-played");
    localStorage.setItem("portfolio-persona", "creative");
    const { container } = render(<App />);
    const overlay = container.querySelector('[aria-hidden="true"].fixed.inset-0');
    expect(overlay).not.toBeNull();
    expect(overlay?.textContent).toContain("A");
    expect(await screen.findByTestId("creative-persona")).toBeInTheDocument();
    expect(sessionStorage.getItem("intro-played")).toBe("1");
  });

});
