import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { fireEvent, getDefaultNormalizer, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Terminal, { LOG_HEIGHT, LOG_HEIGHT_ACTIVE } from "./Terminal";
import { IDLE_LINES } from "./commands";

// Report prefers-reduced-motion so output appears instantly (no typewriter waits).
function stubMatchMedia(matches: (query: string) => boolean = (q) => q.includes("prefers-reduced-motion")) {
  vi.stubGlobal(
    "matchMedia",
    (query: string) =>
      ({
        matches: matches(query),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );
}
beforeAll(() => {
  stubMatchMedia();
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
    expect(t.container.querySelector('svg[data-sprite="ahnaf"]')).toBeNull();
    expect(t.container.querySelector('svg[data-sprite="cat"]')).not.toBeNull();
  });

  it("clicking (or pressing Enter on) the cat opens its menu without activating the terminal", async () => {
    const t = setup();
    const cat = screen.getByRole("button", { name: "the cat" });
    await t.user.click(cat);
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByRole("menu", { name: "cat menu" })).toBeInTheDocument();
    expect(t.card()).toHaveAttribute("tabindex", "0");
    cat.focus();
    await t.user.keyboard("{Enter}"); // closes it
    expect(screen.queryByRole("menu")).toBeNull();
    await t.user.keyboard("{Enter}"); // opens it again
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("a pointer press on the cat never moves focus (WebKit would hand it to the card and activate the terminal)", async () => {
    const t = setup();
    const cat = screen.getByRole("button", { name: "the cat" });
    expect(fireEvent.pointerDown(cat)).toBe(false); // default prevented
    expect(fireEvent.mouseDown(cat)).toBe(false);
    expect(screen.queryByRole("textbox")).toBeNull();
    await t.user.click(cat); // user-event moves focus on mousedown unless it is prevented
    expect(cat).not.toHaveFocus(); // the menu it opened took focus instead
    expect(screen.getByRole("menuitem", { name: "play a game" })).toHaveFocus();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("clicking the cat while the terminal is active opens the menu and keeps the terminal active", async () => {
    const t = setup();
    await t.activate();
    await t.user.click(screen.getByRole("button", { name: "the cat" }));
    expect(screen.getByRole("menuitem", { name: "play a game" })).toHaveFocus();
    expect(t.card()).toHaveAttribute("data-active", "true");
  });

  it("Escape in the menu does not deactivate the terminal", async () => {
    const t = setup();
    await t.activate();
    await t.user.click(screen.getByRole("button", { name: "the cat" }));
    expect(screen.getByRole("menu", { name: "cat menu" })).toBeInTheDocument();
    await t.user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(t.card()).toHaveAttribute("data-active", "true");
    expect(screen.getByRole("button", { name: "the cat" })).toHaveFocus();
  });

  it("choosing pet (or nope) hands focus back to the input, and the terminal stays active", async () => {
    const t = setup();
    const input = await t.activate();
    await t.user.click(screen.getByRole("button", { name: "the cat" }));
    await t.user.click(screen.getByRole("menuitem", { name: "pet" }));
    expect(screen.queryByRole("menu")).toBeNull();
    expect(input).toHaveFocus();
    expect(t.card()).toHaveAttribute("data-active", "true");
    await t.user.click(screen.getByRole("button", { name: "the cat" }));
    await t.user.keyboard("{ArrowUp}{Enter}"); // nope
    expect(screen.queryByRole("menu")).toBeNull();
    expect(input).toHaveFocus();
  });

  it("Tab closes the menu and moves on past the cat; Shift+Tab lands before it, the terminal still active", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Terminal />
        <button type="button">after the hero</button>
      </>,
    );
    const card = screen.getByLabelText("Interactive terminal. Click or press Enter to type commands.");
    const cat = screen.getByRole("button", { name: "the cat" });
    await user.click(card);
    await user.click(cat);
    expect(screen.getByRole("menu")).toBeInTheDocument();
    await user.tab();
    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.getByRole("button", { name: "after the hero" })).toHaveFocus();

    await user.click(card);
    await user.click(cat);
    expect(screen.getByRole("menu")).toBeInTheDocument();
    await user.tab({ shift: true });
    expect(screen.queryByRole("menu")).toBeNull();
    const before = document.activeElement as HTMLElement;
    expect(before === screen.getByRole("textbox", { name: "terminal input" }) || before.closest("p")?.textContent?.startsWith("try:")).toBe(true);
    expect(card).toHaveAttribute("data-active", "true");
  });

  it("menu use never activates the terminal", async () => {
    const t = setup();
    expect(t.card()).toHaveAttribute("data-active", "false");
    await t.user.click(screen.getByRole("button", { name: "the cat" }));
    await t.user.click(screen.getByRole("menuitem", { name: "nope" }));
    expect(screen.queryByRole("menu")).toBeNull();
    expect(t.card()).toHaveAttribute("data-active", "false");
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("the cat comes after the input (and hint links) in tab order; tabbing to it keeps the terminal active", async () => {
    const t = setup();
    await t.activate();
    const cat = screen.getByRole("button", { name: "the cat" });
    for (let i = 0; i < 8 && document.activeElement !== cat; i++) await t.user.tab();
    expect(cat).toHaveFocus();
    expect(t.input()).toBeInTheDocument(); // still active: focus stayed inside the card
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

  it("Tab with nothing to complete is not swallowed, so focus can leave", async () => {
    const t = setup();
    const input = await t.activate();
    await t.user.keyboard("zzz{Tab}");
    expect(input).not.toHaveFocus();
  });

  it("after Ctrl+L, leaving the card shows the idle lines again", async () => {
    const t = setup();
    await t.activate();
    await t.user.keyboard("help{Enter}");
    await t.user.keyboard("{Control>}l{/Control}");
    await t.user.keyboard("{Escape}");
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(within(t.log()).getByText(IDLE_LINES[0].text)).toBeInTheDocument();
  });

  it("card is a labelled group and the input is described by the keyboard hint", async () => {
    const t = setup();
    expect(t.card()).toHaveAttribute("role", "group");
    const input = await t.activate();
    expect(input).toHaveAccessibleDescription(
      "Click or press Enter to type commands. Arrow keys recall history, Tab completes, Escape leaves. The card grows while you type.",
    );
    expect(input).toHaveClass("text-base", "sm:text-sm");
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

  it("a love-mode answer prints the answer and the cat goes lovey (love pose, heart bubble)", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => Response.json({ answer: "Prono is his girlfriend and he adores her! ♥", mode: "love" }));
    try {
      window.localStorage.removeItem("portfolio-ask-quota");
      const t = setup();
      await t.activate();
      await t.user.keyboard("ask who is Prono?{Enter}");
      expect(await within(t.log()).findByText("Prono is his girlfriend and he adores her! ♥")).toBeInTheDocument();
      expect(fetchSpy).toHaveBeenCalledOnce();
      expect(t.container.querySelector('svg[data-sprite="cat"]')).toHaveAttribute("data-pose", "love");
      expect(t.container.querySelector("[data-bubble]")).toHaveTextContent("♥");
    } finally {
      fetchSpy.mockRestore();
      window.localStorage.removeItem("portfolio-ask-quota");
    }
  });

  it("a normal answer puts the cat in the happy pose, not the love pose", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => Response.json({ answer: "He builds agents.", mode: "normal" }));
    try {
      window.localStorage.removeItem("portfolio-ask-quota");
      const t = setup();
      await t.activate();
      await t.user.keyboard("ask what do you do{Enter}");
      expect(await within(t.log()).findByText("He builds agents.")).toBeInTheDocument();
      expect(t.container.querySelector('svg[data-sprite="cat"]')).toHaveAttribute("data-pose", "happy");
    } finally {
      fetchSpy.mockRestore();
      window.localStorage.removeItem("portfolio-ask-quota");
    }
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

  it("grows while active and shrinks on Escape", async () => {
    const t = setup();
    const log = screen.getByTestId("terminal-log");
    expect(log).toBe(t.log());
    expect(log.className).toContain(LOG_HEIGHT);
    expect(log.className).not.toContain(LOG_HEIGHT_ACTIVE);
    expect(t.card()).toHaveAttribute("data-active", "false");
    await t.activate();
    expect(log.className).toContain(LOG_HEIGHT_ACTIVE);
    expect(log.className).not.toContain(LOG_HEIGHT);
    expect(t.card()).toHaveAttribute("data-active", "true");
    await t.user.keyboard("{Escape}");
    expect(log.className).toContain(LOG_HEIGHT);
    expect(log.className).not.toContain(LOG_HEIGHT_ACTIVE);
    expect(t.card()).toHaveAttribute("data-active", "false");
  });

  it("toggling quickly ends inactive", async () => {
    const t = setup();
    await t.activate();
    await t.user.keyboard("{Escape}");
    await t.activate();
    await t.user.keyboard("{Escape}");
    const log = screen.getByTestId("terminal-log");
    expect(log.className).toContain(LOG_HEIGHT);
    expect(log.className).not.toContain(LOG_HEIGHT_ACTIVE);
    expect(log.style.height).toBe("");
    expect(t.card()).toHaveAttribute("data-active", "false");
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("has a height transition that reduced motion removes", () => {
    setup();
    expect(screen.getByTestId("terminal-log")).toHaveClass(
      "transition-[height]",
      "duration-[260ms]",
      "ease-out",
      "motion-reduce:transition-none",
    );
  });

  it("scrolls the log to the bottom when the height transition ends", async () => {
    const t = setup();
    await t.activate();
    const log = screen.getByTestId("terminal-log");
    Object.defineProperty(log, "scrollHeight", { configurable: true, value: 500 });
    log.scrollTop = 0;
    fireEvent.transitionEnd(log, { propertyName: "opacity" });
    expect(log.scrollTop).toBe(0);
    fireEvent.transitionEnd(log, { propertyName: "height" });
    expect(log.scrollTop).toBe(500);
  });

  it("the screen-reader description says the card grows", () => {
    setup();
    expect(screen.getByText(/The card grows while you type\.$/)).toHaveClass("sr-only");
  });

  it("shows a blinking block cursor only while inactive", async () => {
    const t = setup();
    const c = screen.getByTestId("idle-cursor");
    expect(c).toHaveAttribute("aria-hidden", "true");
    expect(c).toHaveTextContent("▍");
    expect(c.className).toContain("animate-[blink_1s_steps(1)_infinite]");
    expect(c.className).toContain("motion-reduce:animate-none");
    expect(c).toHaveClass("text-accent");
    await t.user.click(screen.getByRole("group"));
    expect(screen.queryByTestId("idle-cursor")).toBeNull();
    // Inactive again with output: the cursor follows the pending text.
    await t.user.keyboard("skills{Enter}pro{Escape}");
    expect(screen.getByTestId("idle-cursor").previousSibling).toHaveTextContent("pro");
  });

  it("the idle cursor adds no line to the idle log", () => {
    const t = setup();
    const c = screen.getByTestId("idle-cursor");
    const last = IDLE_LINES[IDLE_LINES.length - 1];
    expect(c.closest("p")).toBe(within(t.log()).getByText(last.text).closest("p"));
    expect(t.log().querySelectorAll("p")).toHaveLength(IDLE_LINES.length);
  });

  it("shows 'click to type' until the first activation and never again", async () => {
    const t = setup();
    const hint = screen.getByTestId("type-hint");
    expect(hint).toHaveTextContent("click to type");
    expect(hint).toHaveClass("ml-auto", "font-mono", "text-xs", "text-ink-faint");
    expect(hint.parentElement).toBe(screen.getByText("ahnaf@portfolio: ~").parentElement);
    await t.activate();
    expect(screen.queryByTestId("type-hint")).toBeNull();
    await t.user.keyboard("{Escape}");
    expect(t.card()).toHaveAttribute("data-active", "false");
    expect(screen.queryByTestId("type-hint")).toBeNull();
  });

  it("keeps the title bar on one line and hides the label below the fit width", () => {
    setup();
    const hint = screen.getByTestId("type-hint");
    expect(hint).toHaveClass("whitespace-nowrap");
    expect(hint).toHaveClass("hidden");
    expect(hint).toHaveClass("min-[23rem]:inline");
    expect(hint).not.toHaveClass("transition-opacity");
    expect(screen.getByText("ahnaf@portfolio: ~")).toHaveClass("whitespace-nowrap");
  });

  it("says 'tap to type' on hover-none devices", () => {
    stubMatchMedia((q) => q.includes("prefers-reduced-motion") || q === "(hover: none)");
    try {
      setup();
      expect(screen.getByTestId("type-hint")).toHaveTextContent("tap to type");
    } finally {
      stubMatchMedia();
    }
  });

  it("renders without matchMedia", () => {
    vi.stubGlobal("matchMedia", undefined);
    try {
      setup();
      expect(screen.getByTestId("type-hint")).toHaveTextContent("click to type");
    } finally {
      stubMatchMedia();
    }
  });

  it("card has the hover affordance while inactive and a steady accent border while active", async () => {
    const t = setup();
    const card = screen.getByTestId("terminal-card");
    expect(card).toHaveClass("rounded-xl", "transition-colors", "border-line", "hover:border-accent/60", "cursor-text");
    await t.activate();
    expect(card).toHaveClass("border-accent/60", "transition-colors");
    expect(card).not.toHaveClass("border-line");
    expect(card).not.toHaveClass("cursor-text");
    expect(card).not.toHaveClass("hover:border-accent/60");
    expect(screen.getByRole("button", { name: "the cat" })).toHaveClass("cursor-pointer");
  });
});
