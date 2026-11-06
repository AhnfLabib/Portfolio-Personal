import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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

  it("frames settle in once with a staggered CSS entrance, off under reduced motion; the large (LCP) frame paints at once", () => {
    const { container } = render(<CreativeHero />);
    const frames = container.querySelectorAll("[data-frame]");
    expect(frames).toHaveLength(5);
    frames.forEach((el, i) => {
      expect(within(el as HTMLElement).getByRole("img")).toBeInTheDocument();
      if (i === 0) {
        expect(el.className).not.toMatch(/animate-settle/);
        expect((el as HTMLElement).style.animationDelay).toBe("");
        return;
      }
      expect(el.className).toMatch(/animate-settle/);
      expect(el.className).toMatch(/motion-reduce:animate-none/);
      expect((el as HTMLElement).style.animationDelay).toBe(`${i * 60}ms`);
    });
  });

  it("frames are not interactive and there is no marquee or photo gradient", () => {
    const { container } = render(<CreativeHero />);
    expect(container.querySelectorAll("[data-frame] a, [data-frame] button")).toHaveLength(0);
    expect(container.querySelector("[data-marquee]")).toBeNull();
    expect(container.querySelector('[class*="gradient"]')).toBeNull();
  });

  it("sizes the landscape slots by cell height (object-cover over 16:9), not cell width", () => {
    render(<CreativeHero />);
    const imgs = screen.getAllByRole("img");
    expect(imgs[2]).toHaveAttribute("sizes", "(min-width: 1024px) 30vw, 120vw");
    expect(imgs[3]).toHaveAttribute("sizes", "(min-width: 1024px) 30vw, 120vw");
  });

  it("gives the LCP frame three candidates and cell-height sizes matching the index.html preload", () => {
    render(<CreativeHero />);
    const large = screen.getAllByRole("img")[0];
    const srcset = large.getAttribute("srcset") ?? "";
    expect(srcset).toBe("/gallery/r4-02-800.jpg 800w, /gallery/r4-02-1200.jpg 1200w, /gallery/r4-02.jpg 1600w");
    expect(srcset.split(", ")[1]).toBe("/gallery/r4-02-1200.jpg 1200w");
    expect(large).toHaveAttribute("sizes", "(min-width: 1024px) 83vw, 165vw");
    expect(large).toHaveAttribute("fetchpriority", "high");
    const html = readFileSync(resolve(__dirname, "../../../index.html"), "utf8");
    const preload = html.match(/<link\s+rel="preload"[^>]*>/s)?.[0] ?? "";
    expect(preload).toContain(`imagesrcset="${large.getAttribute("srcset")}"`);
    expect(preload).toContain(`imagesizes="${large.getAttribute("sizes")}"`);
  });

  it("draws the CTA arrow in ink, not accent (the chip sits over a light photo)", () => {
    render(<CreativeHero />);
    const arrow = screen.getByText("↓");
    expect(arrow).toHaveClass("text-ink");
    expect(arrow).not.toHaveClass("text-accent");
  });

  it("loads the first three frames eagerly and lazy-loads the two below the phone fold", () => {
    render(<CreativeHero />);
    const imgs = screen.getAllByRole("img");
    [0, 1, 2].forEach((i) => expect(imgs[i]).not.toHaveAttribute("loading", "lazy"));
    [3, 4].forEach((i) => expect(imgs[i]).toHaveAttribute("loading", "lazy"));
  });

  it("keys the multi-column wall to lg (tablets get the phone layout)", () => {
    const { container } = render(<CreativeHero />);
    const section = container.querySelector("section#top")!;
    expect(section.className).toMatch(/lg:h-\[calc\(100svh-4rem\)\]/);
    const all = [section, ...section.querySelectorAll("*")].map((el) => el.getAttribute("class") ?? "");
    expect(all.join(" ")).not.toMatch(/(^|\s)md:/);
  });
});
