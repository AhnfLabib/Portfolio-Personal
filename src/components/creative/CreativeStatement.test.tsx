import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CreativeStatement from "./CreativeStatement";
import { about, creative } from "../../data/content";

describe("CreativeStatement", () => {
  it("statement shows the headshot without a caption and the now line", () => {
    render(<CreativeStatement />);
    expect(screen.getByRole("img", { name: "Ahnaf Labib" })).toHaveAttribute("src", about.artistImage);
    expect(screen.queryByText(/the maker/i)).toBeNull();
    expect(screen.getByText(creative.statement)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(creative.now))).toBeInTheDocument();
  });
});
