import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { BEST_KEY, CatGame } from "./CatGame";

/** A canvas context that records calls (jsdom has no canvas). */
function stubCanvas() {
  const calls: { translate: unknown[][] } = { translate: [] };
  const ctx = {
    fillStyle: "",
    font: "",
    textAlign: "left",
    textBaseline: "alphabetic",
    imageSmoothingEnabled: true,
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn((...args: unknown[]) => void calls.translate.push(args)),
  };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    () => ctx as unknown as CanvasRenderingContext2D,
  );
  return { ctx, calls };
}

const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));
const game = () => screen.getByTestId("game");
/** Long enough for the first obstacle to reach a cat that never jumps. */
const UNTIL_CRASH_MS = 4000;

function Harness(props: { reduceMotion?: boolean; returnTo?: HTMLElement | null; onClose?: () => void }) {
  const [open, setOpen] = useState(true);
  return (
    <CatGame
      open={open}
      onClose={() => {
        props.onClose?.();
        setOpen(false);
      }}
      skin="default"
      shades={false}
      reduceMotion={props.reduceMotion ?? false}
      paletteFrom={{ current: document.body }}
      returnFocusTo={props.returnTo ?? null}
    />
  );
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame", "Date"] });
  localStorage.clear();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  localStorage.clear();
  document.body.style.overflow = "";
  document.body.style.paddingRight = "";
});

describe("CatGame", () => {
  it("renders nothing while closed", () => {
    stubCanvas();
    render(
      <CatGame open={false} onClose={() => {}} skin="default" shades={false} reduceMotion={false} paletteFrom={{ current: null }} returnFocusTo={null} />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens as a modal dialog portalled to the body, titled cat dash, with focus on the game", () => {
    stubCanvas();
    const { container } = render(<Harness />);
    const dialog = screen.getByRole("dialog", { name: "cat dash" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(container.contains(dialog)).toBe(false);
    expect(document.body.contains(dialog)).toBe(true);
    expect(game()).toHaveFocus();
    expect(screen.getByRole("button", { name: "close game" })).toBeInTheDocument();
    expect(screen.getByText(/space \/ tap to jump · esc to close · best 000/)).toBeInTheDocument();
  });

  it("sizes the canvas at 240×135 logical pixels times the device pixel ratio, pixelated", () => {
    stubCanvas();
    vi.stubGlobal("devicePixelRatio", 2);
    render(<Harness />);
    const canvas = game().querySelector("canvas")!;
    expect(canvas.width).toBe(480);
    expect(canvas.height).toBe(270);
    expect(canvas.style.imageRendering).toBe("pixelated");
    vi.unstubAllGlobals();
  });

  it("Escape and the close button both close", () => {
    stubCanvas();
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    fireEvent.keyDown(game(), { key: "Escape", code: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();

    const onClose2 = vi.fn();
    render(<Harness onClose={onClose2} />);
    fireEvent.click(screen.getByRole("button", { name: "close game" }));
    expect(onClose2).toHaveBeenCalledTimes(1);
  });

  it("closing hands focus back to returnFocusTo", () => {
    stubCanvas();
    const back = document.createElement("button");
    document.body.append(back);
    render(<Harness returnTo={back} />);
    expect(game()).toHaveFocus();
    fireEvent.keyDown(game(), { key: "Escape", code: "Escape" });
    expect(back).toHaveFocus();
    back.remove();
  });

  it("Space, ArrowUp, W, Enter and a press on the canvas each jump", () => {
    stubCanvas();
    const presses: (() => void)[] = [
      () => fireEvent.keyDown(game(), { key: " ", code: "Space" }),
      () => fireEvent.keyDown(game(), { key: "ArrowUp", code: "ArrowUp" }),
      () => fireEvent.keyDown(game(), { key: "w", code: "KeyW" }),
      () => fireEvent.keyDown(game(), { key: "Enter", code: "Enter" }),
      () => fireEvent.pointerDown(game().querySelector("canvas")!),
    ];
    for (const press of presses) {
      const r = render(<Harness />); // a fresh run each time, long before the first obstacle arrives
      expect(game()).toHaveAttribute("data-airborne", "false");
      press();
      advance(50);
      expect(game()).toHaveAttribute("data-airborne", "true");
      advance(700);
      expect(game()).toHaveAttribute("data-airborne", "false"); // landed again
      r.unmount();
    }
  });

  it("shows the stored best score zero-padded", () => {
    stubCanvas();
    localStorage.setItem(BEST_KEY, "42");
    render(<Harness />);
    expect(screen.getByText(/best 042$/)).toBeInTheDocument();
  });

  it("a collision ends the game: overlay, again (focused) and close, best written; Space restarts", () => {
    stubCanvas();
    render(<Harness />);
    advance(UNTIL_CRASH_MS);
    expect(game()).toHaveAttribute("data-over", "true");
    const text = screen.getByText(/^game over · \d+$/).textContent!;
    const score = Number(text.split("· ")[1]);
    expect(score).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "again" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "close" })).toBeInTheDocument();
    expect(localStorage.getItem(BEST_KEY)).toBe(String(score));
    expect(screen.getByText(new RegExp(`best ${String(score).padStart(3, "0")}$`))).toBeInTheDocument();

    fireEvent.keyDown(game(), { key: " ", code: "Space" });
    advance(20);
    expect(game()).toHaveAttribute("data-over", "false");
    expect(screen.queryByText(/^game over/)).toBeNull();
    expect(game()).toHaveFocus();
  });

  it("again restarts and close closes from the game-over overlay", () => {
    stubCanvas();
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    advance(UNTIL_CRASH_MS);
    fireEvent.click(screen.getByRole("button", { name: "again" }));
    advance(20);
    expect(game()).toHaveAttribute("data-over", "false");
    advance(UNTIL_CRASH_MS);
    fireEvent.click(screen.getByRole("button", { name: "close" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("pauses when the tab is hidden and resumes on the next input", () => {
    stubCanvas();
    render(<Harness />);
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    act(() => void document.dispatchEvent(new Event("visibilitychange")));
    expect(screen.getByText("paused")).toBeInTheDocument();
    hidden.mockReturnValue(false);
    act(() => void document.dispatchEvent(new Event("visibilitychange")));
    advance(UNTIL_CRASH_MS); // paused: nothing moves, so no crash
    expect(game()).toHaveAttribute("data-over", "false");
    expect(screen.getByText("paused")).toBeInTheDocument();
    fireEvent.keyDown(game(), { key: " ", code: "Space" });
    expect(screen.queryByText("paused")).toBeNull();
    advance(UNTIL_CRASH_MS);
    expect(game()).toHaveAttribute("data-over", "true");
  });

  it("pauses when focus leaves the dialog", () => {
    stubCanvas();
    const outside = document.createElement("button");
    document.body.append(outside);
    render(<Harness />);
    act(() => outside.focus());
    expect(screen.getByText("paused")).toBeInTheDocument();
    outside.remove();
  });

  it("backdrop press keeps focus in the dialog; Escape still closes", () => {
    stubCanvas();
    const onClose = vi.fn();
    const outside = document.createElement("button");
    document.body.append(outside);
    render(<Harness onClose={onClose} />);
    const dialog = screen.getByRole("dialog");
    const backdrop = dialog.parentElement!;
    expect(fireEvent.pointerDown(backdrop)).toBe(false); // default prevented: focus never moves
    expect(fireEvent.mouseDown(backdrop)).toBe(false);
    expect(fireEvent.pointerDown(dialog)).toBe(true); // only the backdrop itself
    expect(screen.getByRole("dialog")).toBeInTheDocument(); // a backdrop press does not close
    expect(game()).toHaveFocus();
    // whatever else moves focus out (a stray Shift+Tab into the page) is pulled back
    act(() => outside.focus());
    expect(game()).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: "Escape", code: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
    // once closed the guard is gone: focus moves freely again
    act(() => outside.focus());
    expect(outside).toHaveFocus();
    outside.remove();
  });

  it("closing still hands focus out of the dialog (the guard does not pull it back)", () => {
    stubCanvas();
    const back = document.createElement("button");
    document.body.append(back);
    render(<Harness returnTo={back} />);
    fireEvent.click(screen.getByRole("button", { name: "close game" }));
    expect(back).toHaveFocus();
    back.remove();
  });

  it("traps Tab between the close button and the game", () => {
    stubCanvas();
    render(<Harness />);
    const close = screen.getByRole("button", { name: "close game" });
    fireEvent.keyDown(game(), { key: "Tab", code: "Tab" });
    expect(close).toHaveFocus();
    fireEvent.keyDown(close, { key: "Tab", code: "Tab" });
    expect(game()).toHaveFocus();
    fireEvent.keyDown(game(), { key: "Tab", code: "Tab", shiftKey: true });
    expect(close).toHaveFocus();
    fireEvent.keyDown(close, { key: "Tab", code: "Tab", shiftKey: true });
    expect(game()).toHaveFocus();
  });

  it("best score storage failure is swallowed", () => {
    stubCanvas();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    const errors = vi.spyOn(console, "error");
    render(<Harness />);
    expect(screen.getByText(/best 000$/)).toBeInTheDocument();
    advance(UNTIL_CRASH_MS);
    expect(game()).toHaveAttribute("data-over", "true");
    expect(screen.getByText(/^game over · \d+$/)).toBeInTheDocument();
    expect(errors).not.toHaveBeenCalled();
  });

  it("locks body scroll while open and restores it after", () => {
    stubCanvas();
    document.body.style.overflow = "scroll";
    render(<Harness />);
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(game(), { key: "Escape", code: "Escape" });
    expect(document.body.style.overflow).toBe("scroll");
  });

  it("pads the body by the scrollbar width while locked, so the page does not shift, and restores it after", () => {
    stubCanvas();
    vi.spyOn(window, "innerWidth", "get").mockReturnValue(1000);
    vi.spyOn(document.documentElement, "clientWidth", "get").mockReturnValue(985);
    document.body.style.paddingRight = "3px";
    render(<Harness />);
    expect(document.body.style.paddingRight).toBe("15px");
    fireEvent.keyDown(game(), { key: "Escape", code: "Escape" });
    expect(document.body.style.paddingRight).toBe("3px");
  });

  it("reads the palette element from the ref when it opens, not when the parent rendered", () => {
    stubCanvas();
    const ref: { current: HTMLElement | null } = { current: null };
    const props = { onClose: () => {}, skin: "default" as const, shades: false, reduceMotion: false, paletteFrom: ref, returnFocusTo: null };
    const { rerender } = render(<CatGame open={false} {...props} />);
    const el = document.createElement("div");
    document.body.append(el);
    ref.current = el;
    const computed = vi.spyOn(window, "getComputedStyle");
    rerender(<CatGame open {...props} />);
    expect(computed).toHaveBeenCalledWith(el);
    el.remove();
  });

  it("does not shake under reduced motion", () => {
    const moving = stubCanvas();
    const a = render(<Harness />);
    advance(UNTIL_CRASH_MS);
    expect(game()).toHaveAttribute("data-over", "true");
    expect(moving.calls.translate.length).toBeGreaterThan(0);
    a.unmount();
    vi.restoreAllMocks();

    const still = stubCanvas();
    render(<Harness reduceMotion />);
    advance(UNTIL_CRASH_MS);
    expect(game()).toHaveAttribute("data-over", "true");
    expect(still.calls.translate).toHaveLength(0);
  });
});
