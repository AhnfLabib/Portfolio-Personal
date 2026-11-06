import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import { CatMenu } from "./CatMenu";

afterEach(cleanup);

function setup() {
  const handlers = {
    onPlay: vi.fn(),
    onPet: vi.fn(),
    onNope: vi.fn(),
    onClose: vi.fn(),
  };
  const parentKeyDown = vi.fn();
  const parentClick = vi.fn();
  const utils = render(
    <div>
      <button type="button">outside</button>
      <div onKeyDown={parentKeyDown} onClick={parentClick}>
        <CatMenu {...handlers} />
      </div>
    </div>,
  );
  const item = (name: string) => utils.getByRole("menuitem", { name });
  return { ...utils, ...handlers, parentKeyDown, parentClick, item };
}

describe("CatMenu", () => {
  it("is a labelled menu of three items in order", () => {
    const t = setup();
    const menu = t.getByRole("menu", { name: "cat menu" });
    const items = t.getAllByRole("menuitem");
    expect(items.map((i) => i.textContent)).toEqual(["play a game", "pet", "nope"]);
    for (const i of items) {
      expect(menu).toContainElement(i);
      expect(i.tagName).toBe("BUTTON");
      expect(i).toHaveClass("min-h-8");
    }
  });

  it("focuses the first item on mount", () => {
    const t = setup();
    expect(t.item("play a game")).toHaveFocus();
  });

  it("ArrowDown/ArrowUp move focus and wrap", () => {
    const t = setup();
    fireEvent.keyDown(t.item("play a game"), { key: "ArrowDown" });
    expect(t.item("pet")).toHaveFocus();
    fireEvent.keyDown(t.item("pet"), { key: "ArrowUp" });
    expect(t.item("play a game")).toHaveFocus();
    fireEvent.keyDown(t.item("play a game"), { key: "ArrowUp" });
    expect(t.item("nope")).toHaveFocus();
    fireEvent.keyDown(t.item("nope"), { key: "ArrowDown" });
    expect(t.item("play a game")).toHaveFocus();
  });

  it("Escape calls onClose once and does not reach the parent", () => {
    const t = setup();
    fireEvent.keyDown(t.item("play a game"), { key: "Escape" });
    expect(t.onClose).toHaveBeenCalledTimes(1);
    expect(t.parentKeyDown).not.toHaveBeenCalled();
  });

  it("Tab closes without swallowing the key", () => {
    const t = setup();
    expect(fireEvent.keyDown(t.item("play a game"), { key: "Tab" })).toBe(true); // default not prevented
    expect(t.onClose).toHaveBeenCalledTimes(1);
  });

  it("a pointerdown outside closes; one inside does not", () => {
    const t = setup();
    fireEvent.pointerDown(t.item("pet"));
    expect(t.onClose).not.toHaveBeenCalled();
    fireEvent.pointerDown(t.getByRole("button", { name: "outside" }));
    expect(t.onClose).toHaveBeenCalledTimes(1);
  });

  it("clicking each item calls its handler, and the click stays in the menu", () => {
    const t = setup();
    fireEvent.click(t.item("play a game"));
    expect(t.onPlay).toHaveBeenCalledTimes(1);
    fireEvent.click(t.item("pet"));
    expect(t.onPet).toHaveBeenCalledTimes(1);
    fireEvent.click(t.item("nope"));
    expect(t.onNope).toHaveBeenCalledTimes(1);
    expect(t.onClose).not.toHaveBeenCalled();
    expect(t.parentClick).not.toHaveBeenCalled();
  });

  it("a pointer press on an item never moves focus", () => {
    const t = setup();
    expect(fireEvent.pointerDown(t.item("nope"))).toBe(false);
    expect(fireEvent.mouseDown(t.item("nope"))).toBe(false);
  });
});
