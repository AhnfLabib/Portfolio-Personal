import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreativeRolls from "./CreativeRolls";
import { creative, about } from "../../data/content";

const total = creative.rolls.reduce((n, r) => n + r.frames.length, 0);

describe("CreativeRolls", () => {
  it("renders every frame as a button with alt, width/height, aspect-ratio, lazy", () => {
    const { container } = render(<CreativeRolls onOpen={() => {}} />);
    expect(total).toBe(14);
    expect(container.querySelector("section#rolls")).not.toBeNull();
    expect(container.querySelectorAll("article")).toHaveLength(creative.rolls.length);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(total);
    for (const roll of creative.rolls) {
      expect(screen.getByRole("heading", { level: 2, name: roll.title })).toBeInTheDocument();
      for (const frame of roll.frames) {
        const button = screen.getByRole("button", { name: frame.alt });
        expect(button).toHaveAttribute("type", "button");
        expect(button.style.aspectRatio).not.toBe("");
        const img = button.querySelector("img")!;
        expect(img).toHaveAttribute("alt", frame.alt);
        expect(img).toHaveAttribute("width", String(frame.width));
        expect(img).toHaveAttribute("height", String(frame.height));
        expect(img).toHaveAttribute("loading", "lazy");
        expect(img).toHaveAttribute("decoding", "async");
        expect(img.getAttribute("srcset")).toBe(
          `${frame.src.replace(/\.jpg$/, "-800.jpg")} 800w, ${frame.src} ${frame.width}w`,
        );
      }
    }
  });

  it("clicking a frame calls onOpen with roll and frame index", async () => {
    const onOpen = vi.fn();
    render(<CreativeRolls onOpen={onOpen} />);
    const street = creative.rolls.findIndex((r) => r.id === "street");
    expect(street).toBe(1);
    await userEvent.setup().click(screen.getByRole("button", { name: creative.rolls[1].frames[2].alt }));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith(1, 2);
  });

  it("the hover label is aria-hidden and there is no figcaption", () => {
    const { container } = render(<CreativeRolls onOpen={() => {}} />);
    const label = screen.getByText("R2 · 03");
    expect(label).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("figcaption")).toBeNull();
    // the label must not leak into the button's accessible name
    expect(
      screen.getByRole("button", { name: creative.rolls[1].frames[2].alt }),
    ).toBeInTheDocument();
  });

  it("links to Instagram after the last roll", () => {
    render(<CreativeRolls onOpen={() => {}} />);
    const link = screen.getByRole("link", { name: "More on Instagram → @itsded_inside" });
    expect(link).toHaveAttribute("href", about.instagram);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer");
  });
});
