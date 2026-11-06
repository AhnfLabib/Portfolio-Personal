import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import CreativeStatement from "./CreativeStatement";
import { about, creative } from "../../data/content";

describe("CreativeStatement", () => {
  it("statement shows the headshot without a caption and the now line", () => {
    render(<CreativeStatement />);
    expect(screen.getByRole("img", { name: "Ahnaf Labib" })).toHaveAttribute("src", about.artistImage);
    expect(screen.queryByText(/the maker/i)).toBeNull();
    expect(screen.getByText(creative.statement)).toBeInTheDocument();
    expect(screen.getByText(`now · ${creative.now}`)).toBeInTheDocument();
  });

  it("renders the illustration as a tilted 120px sticker", () => {
    render(<CreativeStatement />);
    const img = screen.getByRole("img", { name: "Ahnaf Labib" });
    expect(img).toHaveAttribute("width", "120");
    expect(img).toHaveAttribute("height", "120");
    expect(img).toHaveClass("rotate-[-4deg]", "border", "border-line", "bg-surface", "p-1");
    expect(img.closest("div")).toHaveClass("md:grid-cols-[160px_1fr]", "gap-10");
  });

  it("sets the statement as a Fraunces italic pull-quote", () => {
    render(<CreativeStatement />);
    expect(screen.getByText(creative.statement)).toHaveClass(
      "font-display",
      "italic",
      "sm:text-[2.75rem]",
      "leading-[1.15]",
      "max-w-[28ch]",
    );
  });

  it("shows the three tags as mono pills", () => {
    render(<CreativeStatement />);
    expect(creative.tags).toEqual(["35mm", "Indianapolis", "slide guitar"]);
    const pills = within(screen.getByRole("list", { name: "Tags" })).getAllByRole("listitem");
    expect(pills.map((p) => p.textContent)).toEqual(creative.tags);
    for (const pill of pills) {
      expect(pill).toHaveClass("rounded-full", "border", "border-line", "font-mono", "text-[11px]", "uppercase");
    }
  });
});
