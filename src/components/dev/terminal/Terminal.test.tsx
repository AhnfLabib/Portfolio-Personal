import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { fireEvent, getDefaultNormalizer, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Terminal from "./Terminal";
import { IDLE_LINES } from "./commands";

// Report prefers-reduced-motion so output appears instantly (no typewriter waits).
beforeAll(() => {
  vi.stubGlobal(
    "matchMedia",
    (query: string) =>
      ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );
});
afterAll(() => {
  vi.unstubAllGlobals();
});

function setup() {
  const user = userEvent.setup();
  const utils = render(<Terminal />);
  const card = () => screen.getByLabelText("Interactive terminal. Click or press Enter to type commands.");
  const log = () => screen.getByRole("log");
  const input = () => screen.getByRole("textbox", { name: "terminal input" });
  const activate = async () => {
    await user.click(card());
    return input();
  };
  return { ...utils, user, card, log, input, activate };
}

describe("Terminal", () => {
  it("idle renders the two idle lines, no input, no hint", () => {
    const t = setup();
    expect(screen.getAllByText("$ whoami")).toHaveLength(1);
    expect(screen.getAllByText("$ current --focus")).toHaveLength(1);
    for (const line of IDLE_LINES) expect(within(t.log()).getByText(line.text)).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByText(/^try:/)).toBeNull();
    expect(t.container.querySelector('svg[data-sprite="ahnaf"]')).not.toBeNull();
    expect(t.container.querySelector('svg[data-sprite="cat"]')).not.toBeNull();
  });

  it("click activates: textbox focused, hint line visible", async () => {
    const t = setup();
    const input = await t.activate();
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute("autocomplete", "off");
    expect(input).toHaveAttribute("spellcheck", "false");
    expect(within(t.log()).getByText(/^try:/)).toBeInTheDocument();
    for (const word of ["help", "projects", "experience", "ask"]) {
      expect(within(t.log()).getByRole("link", { name: word })).toBeInTheDocument();
    }
  });

  it("keyboard focus on the card activates and focuses the input", async () => {
    const t = setup();
    await t.user.tab();
    expect(t.input()).toHaveFocus();
  });

  it("Shift+Tab from the input leaves the card", async () => {
    const t = setup();
    render(<button>before</button>, { container: document.body.insertBefore(document.createElement("div"), document.body.firstChild) });
    await t.activate();
    await t.user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "before" })).toHaveFocus();
    expect(t.card()).not.toContainElement(document.activeElement as HTMLElement);
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("inactive with output shows the pending text but no cursor", async () => {
    const t = setup();
    await t.activate();
    await t.user.keyboard("skills{Enter}pro{Escape}");
    expect(within(t.log()).getByText("pro")).toBeInTheDocument();
    expect(t.log().querySelector(".bg-accent")).toBeNull();
  });

  it("clicking a real link in the log does not pull focus into the input", async () => {
    const t = setup();
    await t.activate();
    await t.user.keyboard("projects{Enter}");
    const jump = within(t.log()).getByRole("link", { name: "→ jump to projects" });
    await t.user.click(jump);
    expect(t.input()).not.toHaveFocus();
  });

  it("Enter during IME composition does not submit", async () => {
    const t = setup();
    const input = await t.activate();
    await t.user.keyboard("help");
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });
    expect(within(t.log()).queryByText("$ help")).toBeNull();
    expect(input).toHaveValue("help");
  });

  it("Enter runs a command and output appears in the log", async () => {
    const t = setup();
    await t.activate();
    await t.user.keyboard("help{Enter}");
    expect(within(t.log()).getByText("$ help")).toBeInTheDocument();
    // command names are padded into a column; the log keeps that whitespace
    expect(within(t.log()).getByText(/^help {8}list commands$/, { normalizer: getDefaultNormalizer({ collapseWhitespace: false }) })).toBeInTheDocument();
    expect(t.log()).toHaveClass("whitespace-pre-wrap");
    expect(t.input()).toHaveValue("");
    expect(screen.queryByText(/^try:/)).toBeNull();
  });

  it("ArrowUp recalls history; Tab completes; Escape blurs", async () => {
    const t = setup();
    await t.activate();
    await t.user.keyboard("skills{Enter}");
    await t.user.keyboard("{ArrowUp}");
    expect(t.input()).toHaveValue("skills");
    await t.user.keyboard("{ArrowDown}");
    expect(t.input()).toHaveValue("");
    await t.user.keyboard("proj{Tab}");
    expect(t.input()).toHaveValue("projects");
    expect(t.input()).toHaveFocus();
    const input = t.input();
    await t.user.keyboard("{Escape}");
    expect(input).not.toHaveFocus();
    // output and the pending text stay after leaving; the input returns on click
    expect(within(t.log()).getByText("$ skills")).toBeInTheDocument();
    expect(within(t.log()).getByText("projects")).toBeInTheDocument();
    expect(await t.activate()).toHaveValue("projects");
  });

  it("Escape before anything ran returns to idle", async () => {
    const t = setup();
    await t.activate();
    await t.user.keyboard("{Escape}");
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByText(/^try:/)).toBeNull();
  });

  it("Ctrl+L clears", async () => {
    const t = setup();
    await t.activate();
    await t.user.keyboard("help{Enter}");
    await t.user.keyboard("{Control>}l{/Control}");
    expect(within(t.log()).queryByText("$ help")).toBeNull();
    expect(within(t.log()).queryByText("$ whoami")).toBeNull();
    expect(t.input()).toHaveFocus();
  });

  it("the hint links run commands", async () => {
    const t = setup();
    await t.activate();
    await t.user.click(within(t.log()).getByRole("link", { name: "projects" }));
    expect(within(t.log()).getByText("$ projects")).toBeInTheDocument();
    expect(within(t.log()).getByRole("link", { name: "→ jump to projects" })).toHaveAttribute("href", "#projects");
    expect(t.input()).toHaveFocus();
  });

  it("the ask hint link fills the input instead of running", async () => {
    const t = setup();
    await t.activate();
    await t.user.click(within(t.log()).getByRole("link", { name: "ask" }));
    expect(t.input()).toHaveValue("ask ");
    expect(t.input()).toHaveFocus();
    expect(within(t.log()).queryByText("$ ask")).toBeNull();
  });

  it("external link lines open in a new tab", async () => {
    const t = setup();
    await t.activate();
    await t.user.keyboard("socials{Enter}");
    const external = within(t.log())
      .getAllByRole("link")
      .filter((a) => a.getAttribute("target") === "_blank");
    expect(external.length).toBeGreaterThan(0);
    for (const a of external) expect(a).toHaveAttribute("rel", "noreferrer");
  });

  it("card has the fixed-height classes and the log has overflow-wrap anywhere", () => {
    const t = setup();
    expect(t.card()).toHaveAttribute("tabindex", "0");
    expect(t.card()).toHaveClass("relative");
    expect(t.log()).toHaveAttribute("aria-live", "polite");
    expect(t.log()).toHaveClass(
      "h-[9.25rem]",
      "min-[24.875rem]:h-[8.25rem]",
      "min-[29.8125rem]:h-[7.25rem]",
      "sm:h-[8.25rem]",
      "overflow-y-auto",
      "space-y-3",
      "p-4",
      "font-mono",
      "text-xs",
      "sm:text-sm",
      "[overflow-wrap:anywhere]",
    );
    const bar = screen.getByText("ahnaf@portfolio: ~");
    expect(bar.closest(".overflow-hidden")).toHaveClass(
      "rounded-xl",
      "border",
      "border-line",
      "bg-surface",
      "text-left",
      "shadow-2xl",
      "shadow-black/40",
    );
  });
});
