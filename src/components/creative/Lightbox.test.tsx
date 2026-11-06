import { describe, it, expect, vi, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Lightbox from "./Lightbox";
import { nextIndex, type Pos } from "./lightboxNav";
import { creative } from "../../data/content";

const rolls = creative.rolls;
const last = { roll: rolls.length - 1, frame: rolls.at(-1)!.frames.length - 1 };

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.style.overflow = "";
});

describe("Lightbox", () => {
  it("renders nothing when pos is null", () => {
    const { container } = render(
      <Lightbox rolls={rolls} pos={null} onClose={() => {}} onNavigate={() => {}} returnFocusTo={null} />,
    );
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("is a modal dialog labelled by the frame alt, with the label R1 · 01", () => {
    const frame = rolls[0].frames[0];
    render(
      <Lightbox rolls={rolls} pos={{ roll: 0, frame: 0 }} onClose={() => {}} onNavigate={() => {}} returnFocusTo={null} />,
    );
    const dialog = screen.getByRole("dialog", { name: frame.alt });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog.parentElement?.parentElement).toBe(document.body);
    expect(screen.getByText("R1 · 01")).toBeInTheDocument();
    const img = screen.getByRole("img", { name: frame.alt });
    expect(img).toHaveAttribute("src", frame.src);
    expect(img).toHaveAttribute("width", String(frame.width));
    expect(img).toHaveAttribute("height", String(frame.height));
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Previous frame" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next frame" })).toBeInTheDocument();
  });

  it("ArrowRight calls onNavigate with nextIndex; Escape calls onClose; focus returns to returnFocusTo", async () => {
    const user = userEvent.setup();
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    const pos: Pos = { roll: 0, frame: 4 };
    const onNavigate = vi.fn();
    const onClose = vi.fn();
    const { rerender } = render(
      <Lightbox rolls={rolls} pos={pos} onClose={onClose} onNavigate={onNavigate} returnFocusTo={opener} />,
    );
    await user.keyboard("{ArrowRight}");
    expect(onNavigate).toHaveBeenCalledWith(nextIndex(rolls, pos, 1));
    await user.keyboard("{ArrowLeft}");
    expect(onNavigate).toHaveBeenLastCalledWith(nextIndex(rolls, pos, -1));
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
    rerender(<Lightbox rolls={rolls} pos={null} onClose={onClose} onNavigate={onNavigate} returnFocusTo={opener} />);
    expect(opener).toHaveFocus();
    opener.remove();
  });

  it("traps Tab among its three buttons", async () => {
    const user = userEvent.setup();
    render(
      <Lightbox rolls={rolls} pos={{ roll: 0, frame: 1 }} onClose={() => {}} onNavigate={() => {}} returnFocusTo={null} />,
    );
    const close = screen.getByRole("button", { name: "Close" });
    const prev = screen.getByRole("button", { name: "Previous frame" });
    const next = screen.getByRole("button", { name: "Next frame" });
    expect(close).toHaveFocus();
    await user.tab();
    expect(prev).toHaveFocus();
    await user.tab();
    expect(next).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
    await user.tab({ shift: true });
    expect(next).toHaveFocus();
  });

  it("clicking the backdrop closes, clicking the image does not", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Lightbox rolls={rolls} pos={{ roll: 0, frame: 0 }} onClose={onClose} onNavigate={() => {}} returnFocusTo={null} />,
    );
    await user.click(screen.getByRole("img"));
    expect(onClose).not.toHaveBeenCalled();
    await user.click(screen.getByRole("dialog").parentElement!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps keyboard handling after a click on the image moves focus off the buttons", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onNavigate = vi.fn();
    const pos: Pos = { roll: 0, frame: 1 };
    render(<Lightbox rolls={rolls} pos={pos} onClose={onClose} onNavigate={onNavigate} returnFocusTo={null} />);
    await user.click(screen.getByRole("img"));
    expect(screen.getByRole("dialog")).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(onNavigate).toHaveBeenCalledWith(nextIndex(rolls, pos, 1));
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
    await user.tab();
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
  });

  it("a left swipe of 40px or more navigates to the next frame and does not close", () => {
    const onClose = vi.fn();
    const onNavigate = vi.fn();
    const pos: Pos = { roll: 0, frame: 1 };
    render(<Lightbox rolls={rolls} pos={pos} onClose={onClose} onNavigate={onNavigate} returnFocusTo={null} />);
    const dialog = screen.getByRole("dialog");
    fireEvent.pointerDown(dialog, { clientX: 300, pointerId: 1 });
    fireEvent.pointerUp(dialog, { clientX: 200, pointerId: 1 });
    expect(onNavigate).toHaveBeenCalledWith(nextIndex(rolls, pos, 1));
    fireEvent.click(dialog.parentElement!);
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.pointerDown(dialog, { clientX: 300, pointerId: 2 });
    fireEvent.pointerUp(dialog, { clientX: 280, pointerId: 2 });
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it("captures the pointer for a swipe on the image but not for a press on a button", () => {
    const capture = vi.fn();
    const original = HTMLElement.prototype.setPointerCapture;
    HTMLElement.prototype.setPointerCapture = capture;
    try {
      render(<Lightbox rolls={rolls} pos={{ roll: 0, frame: 1 }} onClose={() => {}} onNavigate={() => {}} returnFocusTo={null} />);
      for (const name of ["Close", "Previous frame", "Next frame"]) {
        fireEvent.pointerDown(screen.getByRole("button", { name }), { clientX: 300, pointerId: 1 });
      }
      expect(capture).not.toHaveBeenCalled();
      fireEvent.pointerDown(screen.getByRole("img"), { clientX: 300, pointerId: 7 });
      expect(capture).toHaveBeenCalledTimes(1);
      expect(capture).toHaveBeenCalledWith(7);
    } finally {
      HTMLElement.prototype.setPointerCapture = original;
    }
  });

  it("a backdrop tap after a touch swipe (no click) still closes", () => {
    const onClose = vi.fn();
    render(<Lightbox rolls={rolls} pos={{ roll: 0, frame: 1 }} onClose={onClose} onNavigate={() => {}} returnFocusTo={null} />);
    const dialog = screen.getByRole("dialog");
    const backdrop = dialog.parentElement!;
    fireEvent.pointerDown(dialog, { clientX: 300, pointerId: 1 });
    fireEvent.pointerUp(dialog, { clientX: 200, pointerId: 1 });
    // touch: no click follows the swipe
    fireEvent.pointerDown(backdrop, { clientX: 10, pointerId: 2 });
    fireEvent.pointerUp(backdrop, { clientX: 10, pointerId: 2 });
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("only the active control turns accent; an end control is dimmed without hover accent", () => {
    render(<Lightbox rolls={rolls} pos={{ roll: 0, frame: 0 }} onClose={() => {}} onNavigate={() => {}} returnFocusTo={null} />);
    const prev = screen.getByRole("button", { name: "Previous frame" });
    const next = screen.getByRole("button", { name: "Next frame" });
    expect(prev).toHaveClass("opacity-40");
    expect(prev.className).not.toMatch(/hover:text-accent/);
    expect(next.className).toMatch(/hover:text-accent/);
    expect(next).not.toHaveClass("opacity-40");
  });

  it("marks prev/next aria-disabled at the very ends and ignores their clicks", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    const props = { rolls, onClose: () => {}, onNavigate, returnFocusTo: null };
    const { rerender } = render(<Lightbox {...props} pos={{ roll: 0, frame: 0 }} />);
    const prev = screen.getByRole("button", { name: "Previous frame" });
    expect(prev).toHaveAttribute("aria-disabled", "true");
    expect(prev).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Next frame" })).not.toHaveAttribute("aria-disabled");
    await user.click(prev);
    expect(onNavigate).not.toHaveBeenCalled();
    rerender(<Lightbox {...props} pos={last} />);
    const next = screen.getByRole("button", { name: "Next frame" });
    expect(next).toHaveAttribute("aria-disabled", "true");
    await user.click(next);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("honours a returnFocusTo that changes in the same update that closes", () => {
    const a = document.createElement("button");
    const b = document.createElement("button");
    document.body.append(a, b);
    const props = { rolls, onClose: () => {}, onNavigate: () => {} };
    const { rerender } = render(<Lightbox {...props} pos={{ roll: 0, frame: 0 }} returnFocusTo={a} />);
    rerender(<Lightbox {...props} pos={null} returnFocusTo={b} />);
    expect(b).toHaveFocus();
    a.remove();
    b.remove();
  });

  it("announces the frame label politely", () => {
    render(<Lightbox rolls={rolls} pos={{ roll: 0, frame: 0 }} onClose={() => {}} onNavigate={() => {}} returnFocusTo={null} />);
    expect(screen.getByText("R1 · 01")).toHaveAttribute("aria-live", "polite");
  });

  it("locks body scroll while open and restores on close", () => {
    document.body.style.overflow = "scroll";
    const props = { rolls, onClose: () => {}, onNavigate: () => {}, returnFocusTo: null };
    const { rerender, unmount } = render(<Lightbox {...props} pos={{ roll: 0, frame: 0 }} />);
    expect(document.body.style.overflow).toBe("hidden");
    rerender(<Lightbox {...props} pos={null} />);
    expect(document.body.style.overflow).toBe("scroll");
    rerender(<Lightbox {...props} pos={{ roll: 1, frame: 0 }} />);
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("scroll");
  });

  it("preloads prev and next (link rel=preload or new Image()) — assert via a spy on global Image", () => {
    const srcs: string[] = [];
    class FakeImage {
      set src(v: string) {
        srcs.push(v);
      }
    }
    const ImageSpy = vi.fn(function () {
      return new FakeImage();
    });
    vi.stubGlobal("Image", ImageSpy);
    render(
      <Lightbox rolls={rolls} pos={{ roll: 1, frame: 0 }} onClose={() => {}} onNavigate={() => {}} returnFocusTo={null} />,
    );
    expect(ImageSpy).toHaveBeenCalled();
    expect(srcs).toEqual(expect.arrayContaining([rolls[0].frames[4].src, rolls[1].frames[1].src]));
  });
});
