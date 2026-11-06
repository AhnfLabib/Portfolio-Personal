import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import CreativeHero from "./CreativeHero";
import { creative } from "../../data/content";

describe("CreativeHero", () => {
  it("renders the five wall frames with their alt text and real dimensions", () => {
    render(<CreativeHero />);
    const imgs = screen.getAllByRole("img");
    expect(imgs).toHaveLength(5);
    creative.hero.wall.forEach((frame, i) => {
      expect(imgs[i]).toHaveAccessibleName(frame.alt);
      expect(imgs[i]).toHaveAttribute("width", String(frame.width));
      expect(imgs[i]).toHaveAttribute("height", String(frame.height));
    });
  });

  it("gives the large frame high fetch priority and its main src", () => {
    render(<CreativeHero />);
    const large = screen.getByRole("img", { name: creative.hero.wall[0].alt });
    expect(large).toHaveAttribute("fetchpriority", "high");
    expect(large).toHaveAttribute("src", creative.hero.wall[0].src);
    expect(large).not.toHaveAttribute("loading", "lazy");
  });

  it("shows the name as h1, the mono line and the CTA to #rolls", () => {
    render(<CreativeHero />);
    expect(screen.getByRole("heading", { level: 1, name: "Ahnaf Labib" })).toBeInTheDocument();
    expect(screen.getByText(creative.hero.line)).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: creative.hero.cta });
    expect(cta).toHaveAttribute("href", "#rolls");
  });

  it("frames settle in once with a staggered CSS entrance, off under reduced motion", () => {
    const { container } = render(<CreativeHero />);
    const frames = container.querySelectorAll("[data-frame]");
    expect(frames).toHaveLength(5);
    frames.forEach((el, i) => {
      expect(el.className).toMatch(/animate-settle/);
      expect(el.className).toMatch(/motion-reduce:animate-none/);
      expect((el as HTMLElement).style.animationDelay).toBe(`${i * 60}ms`);
      expect(within(el as HTMLElement).getByRole("img")).toBeInTheDocument();
    });
  });

  it("frames are not interactive and there is no marquee or photo gradient", () => {
    const { container } = render(<CreativeHero />);
    expect(container.querySelectorAll("[data-frame] a, [data-frame] button")).toHaveLength(0);
    expect(container.querySelector("[data-marquee]")).toBeNull();
    expect(container.querySelector('[class*="gradient"]')).toBeNull();
  });
});
