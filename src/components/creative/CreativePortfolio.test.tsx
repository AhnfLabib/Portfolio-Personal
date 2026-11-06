import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreativePortfolio from "./CreativePortfolio";
import { PersonaProvider } from "../../persona/PersonaContext";
import { creative, socials } from "../../data/content";

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

  it("contact has the headline, four mono links, no button, and keeps the dev switch", async () => {
    window.localStorage.setItem("portfolio-persona", "creative");
    const user = userEvent.setup();
    render(
      <PersonaProvider>
        <CreativePortfolio />
      </PersonaProvider>,
    );
    const contact = document.querySelector("section#contact") as HTMLElement;
    const heading = within(contact).getByRole("heading", { level: 2, name: creative.contact.headline });
    expect(heading).toHaveClass("font-display", "sm:text-[5rem]", "leading-none", "tracking-tight");
    expect(within(contact).queryByRole("link", { name: /say hello/i })).toBeNull();
    expect(within(contact).queryByRole("button", { name: /say hello/i })).toBeNull();

    const links = within(contact).getAllByRole("link");
    expect(links.map((a) => a.textContent)).toEqual(["email", "instagram", "linkedin", "github"]);
    const byIcon = (icon: string) => socials.find((s) => s.icon === icon)!.href;
    expect(links[0]).toHaveAttribute("href", byIcon("mail"));
    expect(links[0]).not.toHaveAttribute("target");
    expect(links[1]).toHaveAttribute("href", byIcon("instagram"));
    expect(links[2]).toHaveAttribute("href", byIcon("linkedin"));
    expect(links[3]).toHaveAttribute("href", byIcon("github"));
    for (const a of links.slice(1)) {
      expect(a).toHaveAttribute("target", "_blank");
      expect(a).toHaveAttribute("rel", "noreferrer");
    }
    for (const a of links) expect(a).toHaveClass("text-accent");
    const separators = [...contact.querySelectorAll("span[aria-hidden='true']")].filter((s) => s.textContent === "·");
    expect(separators).toHaveLength(3);
    expect(contact.querySelector("svg")).toBeNull();

    const devSwitch = within(contact).getByRole("button", { name: /the dev side/ });
    expect(document.documentElement.dataset.persona).toBe("creative");
    await user.click(devSwitch);
    expect(document.documentElement.dataset.persona).toBe("dev");
    expect(window.localStorage.getItem("portfolio-persona")).toBe("dev");
  });
});
