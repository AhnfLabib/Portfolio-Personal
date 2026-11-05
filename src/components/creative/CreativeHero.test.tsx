import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CreativeHero from "./CreativeHero";
import { creative } from "../../data/content";

describe("CreativeHero", () => {
  it("hero renders the hero image with priority and the name + line + cta", () => {
    render(<CreativeHero />);
    const img = screen.getByRole("img", { name: creative.hero.image.alt });
    expect(img).toHaveAttribute("fetchpriority", "high");
    expect(img).toHaveAttribute("width");
    expect(screen.getByRole("heading", { level: 1, name: "Ahnaf Labib" })).toBeInTheDocument();
    expect(screen.getByText(creative.hero.line)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: creative.hero.cta })).toHaveAttribute("href", "#rolls");
  });

  it("hero has no marquee, no decorative blobs", () => {
    render(<CreativeHero />);
    expect(document.querySelector("[data-marquee]")).toBeNull();
  });
});
