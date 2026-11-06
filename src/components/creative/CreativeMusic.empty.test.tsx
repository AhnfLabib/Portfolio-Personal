import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CreativeMusic from "./CreativeMusic";

vi.mock("../../data/content", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../../data/content")>();
  return {
    ...mod,
    creative: { ...mod.creative, music: { ...mod.creative.music, drafts: [] } },
  };
});

describe("CreativeMusic without drafts", () => {
  it("omits the Drafts sub-section when drafts is empty", () => {
    const { container } = render(<CreativeMusic />);
    expect(screen.getByRole("heading", { level: 2, name: "Music" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Drafts" })).toBeNull();
    expect(screen.queryByText("unfinished, on purpose")).toBeNull();
    expect(container.querySelectorAll("audio")).toHaveLength(0);
  });
});
