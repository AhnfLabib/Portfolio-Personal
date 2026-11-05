import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DraftPlayer from "./DraftPlayer";
import type { Draft } from "../../data/content";

const draft: Draft = { title: "Fog", src: "/audio/fog.mp3", month: "", duration: 44 };

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("DraftPlayer", () => {
  it("renders title, button, seek range and times; omits empty month", () => {
    const { container } = render(
      <DraftPlayer draft={draft} index={0} playing={false} onPlay={() => {}} onPause={() => {}} onEnded={() => {}} />,
    );
    expect(screen.getByText("Fog")).toBeInTheDocument();
    const button = screen.getByRole("button", { name: "Play Fog" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    const range = screen.getByRole("slider", { name: "Seek Fog" });
    expect(range).toHaveAttribute("max", "44");
    expect(screen.getByText("0:00 / 0:44")).toBeInTheDocument();
    const audio = container.querySelector("audio")!;
    expect(audio).toHaveAttribute("src", "/audio/fog.mp3");
    expect(audio).toHaveAttribute("preload", "none");
    expect(container.textContent).not.toMatch(/·/);
  });

  it("shows the month when present", () => {
    render(
      <DraftPlayer
        draft={{ ...draft, month: "Oct 2026" }}
        index={0}
        playing={false}
        onPlay={() => {}}
        onPause={() => {}}
        onEnded={() => {}}
      />,
    );
    expect(screen.getByText("Oct 2026")).toBeInTheDocument();
    expect(screen.getByText("Fog").parentElement!.textContent).toBe("Fog · Oct 2026");
  });

  it("calls onPause when play() rejects while still playing", async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValue(new Error("NotAllowedError"));
    const onPause = vi.fn();
    render(<DraftPlayer draft={draft} index={0} playing={true} onPlay={() => {}} onPause={onPause} onEnded={() => {}} />);
    await vi.waitFor(() => expect(onPause).toHaveBeenCalledTimes(1));
  });

  it("does not call onPause on a rejected play() once the row is no longer playing", async () => {
    let reject!: (e: Error) => void;
    vi.mocked(HTMLMediaElement.prototype.play).mockReturnValue(
      new Promise<void>((_, r) => {
        reject = r;
      }),
    );
    const onPause = vi.fn();
    const props = { draft, index: 0, onPlay: () => {}, onPause, onEnded: () => {} };
    const { rerender } = render(<DraftPlayer {...props} playing={true} />);
    rerender(<DraftPlayer {...props} playing={false} />);
    reject(new Error("AbortError"));
    await new Promise((r) => setTimeout(r, 0));
    expect(onPause).not.toHaveBeenCalled();
  });

  it("controls the audio element from the playing prop", () => {
    const props = { draft, index: 2, onPlay: () => {}, onPause: () => {}, onEnded: () => {} };
    const { rerender } = render(<DraftPlayer {...props} playing={false} />);
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    rerender(<DraftPlayer {...props} playing={true} />);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Pause Fog" })).toHaveAttribute("aria-pressed", "true");
    rerender(<DraftPlayer {...props} playing={false} />);
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  });

  it("button click calls onPlay(index) or onPause", async () => {
    const onPlay = vi.fn();
    const onPause = vi.fn();
    const { rerender } = render(
      <DraftPlayer draft={draft} index={2} playing={false} onPlay={onPlay} onPause={onPause} onEnded={() => {}} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Play Fog" }));
    expect(onPlay).toHaveBeenCalledWith(2);
    rerender(<DraftPlayer draft={draft} index={2} playing={true} onPlay={onPlay} onPause={onPause} onEnded={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Pause Fog" }));
    expect(onPause).toHaveBeenCalledTimes(1);
  });

  it("Space on the focused row toggles play", async () => {
    const onPlay = vi.fn();
    const onPause = vi.fn();
    const { container, rerender } = render(
      <DraftPlayer draft={draft} index={1} playing={false} onPlay={onPlay} onPause={onPause} onEnded={() => {}} />,
    );
    const row = container.firstElementChild as HTMLElement;
    row.focus();
    expect(row).toHaveFocus();
    await userEvent.keyboard(" ");
    expect(onPlay).toHaveBeenCalledWith(1);
    rerender(<DraftPlayer draft={draft} index={1} playing={true} onPlay={onPlay} onPause={onPause} onEnded={() => {}} />);
    row.focus();
    await userEvent.keyboard(" ");
    expect(onPause).toHaveBeenCalledTimes(1);
  });

  it("Space on the focused button toggles once, not twice", async () => {
    const onPlay = vi.fn();
    render(<DraftPlayer draft={draft} index={0} playing={false} onPlay={onPlay} onPause={() => {}} onEnded={() => {}} />);
    screen.getByRole("button", { name: "Play Fog" }).focus();
    await userEvent.keyboard(" ");
    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it("range input seeks the audio", () => {
    const { container } = render(
      <DraftPlayer draft={draft} index={0} playing={false} onPlay={() => {}} onPause={() => {}} onEnded={() => {}} />,
    );
    const audio = container.querySelector("audio")!;
    let current = 0;
    Object.defineProperty(audio, "currentTime", {
      configurable: true,
      get: () => current,
      set: (v: number) => {
        current = v;
      },
    });
    fireEvent.change(screen.getByRole("slider", { name: "Seek Fog" }), { target: { value: "12.5" } });
    expect(current).toBe(12.5);
    expect(screen.getByText("0:12 / 0:44")).toBeInTheDocument();
  });

  it("timeupdate drives the range and ended calls onEnded", () => {
    const onEnded = vi.fn();
    const { container } = render(
      <DraftPlayer draft={draft} index={0} playing={true} onPlay={() => {}} onPause={() => {}} onEnded={onEnded} />,
    );
    const audio = container.querySelector("audio")!;
    Object.defineProperty(audio, "currentTime", { configurable: true, get: () => 30 });
    fireEvent.timeUpdate(audio);
    expect(screen.getByRole("slider", { name: "Seek Fog" })).toHaveValue("30");
    expect(screen.getByText("0:30 / 0:44")).toBeInTheDocument();
    fireEvent.ended(audio);
    expect(onEnded).toHaveBeenCalledTimes(1);
  });
});
