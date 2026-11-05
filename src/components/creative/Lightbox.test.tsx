import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Lightbox from "./Lightbox";
import { nextIndex, type Pos } from "./lightboxNav";
import { creative } from "../../data/content";

const rolls = creative.rolls;

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
