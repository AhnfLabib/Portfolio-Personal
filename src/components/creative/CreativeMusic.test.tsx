import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreativeMusic from "./CreativeMusic";
import { creative } from "../../data/content";

const { music } = creative;

class FakeObserver {
  static instances: FakeObserver[] = [];
  callback: IntersectionObserverCallback;
  options?: IntersectionObserverInit;
  observed: Element[] = [];
  disconnected = false;
  constructor(cb: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = cb;
    this.options = options;
    FakeObserver.instances.push(this);
  }
  observe(el: Element) {
    this.observed.push(el);
  }
  unobserve() {}
  disconnect() {
    this.disconnected = true;
  }
  takeRecords() {
    return [];
  }
  fire(isIntersecting: boolean) {
    act(() => {
      this.callback(
        [{ isIntersecting } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      );
    });
  }
}

beforeEach(() => {
  FakeObserver.instances = [];
  vi.stubGlobal("IntersectionObserver", FakeObserver);
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("CreativeMusic", () => {
  it("renders the section heading, line and handle link", () => {
    const { container } = render(<CreativeMusic />);
    expect(container.querySelector("section#music")).not.toBeNull();
    expect(screen.getByRole("heading", { level: 2, name: "Music" })).toBeInTheDocument();
    expect(screen.getByText(music.line)).toBeInTheDocument();
    const handle = screen.getByRole("link", { name: `${music.handle} →` });
    expect(handle).toHaveAttribute("href", music.url);
    expect(handle).toHaveAttribute("target", "_blank");
  });

  it("renders a link line per cover regardless of iframe", () => {
    const { container } = render(<CreativeMusic />);
    expect(container.querySelectorAll("iframe")).toHaveLength(0);
    for (const c of music.covers) {
      const label = c.artist ? `${c.title} · ${c.artist}` : c.title;
      const link = screen.getByRole("link", { name: label });
      expect(link).toHaveAttribute("href", `https://www.instagram.com/reel/${c.reel}/`);
    }
    const list = screen.getAllByRole("list")[0];
    expect(within(list).getAllByRole("listitem")).toHaveLength(music.covers.length);
  });

  it("keeps each cover frame 9:16 under the 70vh cap by capping its width", () => {
    render(<CreativeMusic />);
    const list = screen.getAllByRole("list")[0];
    for (const item of within(list).getAllByRole("listitem")) {
      const frame = item.firstElementChild as HTMLElement;
      expect(frame).toHaveClass("aspect-[9/16]", "mx-auto", "w-full", "max-w-[calc(70vh*9/16)]");
    }
  });

  it("mounts iframes once intersecting", () => {
    const { container } = render(<CreativeMusic />);
    expect(FakeObserver.instances).toHaveLength(1);
    const io = FakeObserver.instances[0];
    expect(io.options?.rootMargin).toBe("400px");
    expect(io.observed[0].tagName).toBe("UL");
    io.fire(false);
    expect(container.querySelectorAll("iframe")).toHaveLength(0);
    io.fire(true);
    const frames = container.querySelectorAll("iframe");
    expect(frames).toHaveLength(3);
    music.covers.forEach((c, i) => {
      expect(frames[i]).toHaveAttribute("src", `https://www.instagram.com/reel/${c.reel}/embed/`);
      expect(frames[i]).toHaveAttribute("title", `${c.title} — cover by Ahnaf Labib`);
      expect(frames[i]).toHaveAttribute("loading", "lazy");
    });
    expect(io.disconnected).toBe(true);
    // link lines still there
    expect(screen.getByRole("link", { name: `${music.covers[0].title} · ${music.covers[0].artist}` })).toBeInTheDocument();
  });

  it("mounts iframes immediately when IntersectionObserver is unavailable", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const { container } = render(<CreativeMusic />);
    expect(container.querySelectorAll("iframe")).toHaveLength(3);
  });

  it("renders drafts rows; playing one pauses the other", async () => {
    render(<CreativeMusic />);
    expect(screen.getByRole("heading", { level: 3, name: "Drafts" })).toBeInTheDocument();
    expect(screen.getByText(music.draftsLine)).toBeInTheDocument();
    for (const d of music.drafts) {
      expect(screen.getByRole("slider", { name: `Seek ${d.title}` })).toBeInTheDocument();
    }
    const [first, second] = music.drafts;
    await userEvent.click(screen.getByRole("button", { name: `Play ${second.title}` }));
    expect(screen.getByRole("button", { name: `Pause ${second.title}` })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: `Play ${first.title}` }));
    expect(screen.getByRole("button", { name: `Pause ${first.title}` })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: `Play ${second.title}` })).toHaveAttribute("aria-pressed", "false");
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2);
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  });
});
