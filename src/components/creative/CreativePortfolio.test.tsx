import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreativePortfolio from "./CreativePortfolio";
import { PersonaProvider } from "../../persona/PersonaContext";
import { creative } from "../../data/content";

class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", NoopObserver);
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
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CreativePortfolio", () => {
  it("renders the five sections in order and opens the lightbox from a frame", async () => {
    const user = userEvent.setup();
    render(
      <PersonaProvider>
        <CreativePortfolio />
      </PersonaProvider>,
    );
    const ids = [...document.querySelectorAll("main section")].map((s) => s.id);
    expect(ids).toEqual(["top", "statement", "rolls", "music", "contact"]);

    const frame = screen.getAllByRole("button", { name: creative.rolls[0].frames[0].alt })[0];
    await user.click(frame);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(frame).toHaveFocus();
  });

  it("contact uses the trimmed copy and keeps the dev switch", () => {
    render(
      <PersonaProvider>
        <CreativePortfolio />
      </PersonaProvider>,
    );
    expect(screen.getByRole("heading", { level: 2, name: creative.contact.headline })).toBeInTheDocument();
    expect(screen.getByText(creative.contact.line)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /the dev side/ })).toBeInTheDocument();
  });
});
