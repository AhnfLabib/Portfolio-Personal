// @vitest-environment node
/// <reference types="node" />
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const css = readFileSync(fileURLToPath(new URL("./index.css", import.meta.url)), "utf8");

function creativeToken(name: string): string {
  const block = css.match(/html\[data-persona="creative"\]\s*\{([^}]*)\}/);
  if (!block) throw new Error("creative persona block not found");
  const value = block[1].match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`));
  if (!value) throw new Error(`--color-${name} not found in creative block`);
  return value[1];
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("creative persona contrast (WCAG AA, normal text)", () => {
  const bg = creativeToken("bg");
  const faint = creativeToken("ink-faint");
  const accent = creativeToken("accent");
  const accentInk = creativeToken("accent-ink");

  it("contrast() matches known WCAG values", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrast("#95897a", "#f6f1e7")).toBeCloseTo(3.04, 1);
  });

  it("ink-faint on bg is at least 4.5:1", () => {
    expect(contrast(faint, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("accent on bg is at least 4.5:1", () => {
    expect(contrast(accent, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("accent-ink on accent is at least 4.5:1", () => {
    expect(contrast(accentInk, accent)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("creative persona palette (spec v2: dark editorial)", () => {
  it("uses the v2 tokens", () => {
    const expected = {
      bg: "#0e0d0b",
      surface: "#161412",
      "surface-2": "#1f1c19",
      line: "#2a2622",
      ink: "#f3eee4",
      "ink-soft": "#c9c1b3",
      "ink-faint": "#8e8477",
      accent: "#e0522f",
      "accent-soft": "#f0663c",
      "accent-ink": "#0e0d0b",
    };
    for (const [name, hex] of Object.entries(expected)) expect(creativeToken(name).toLowerCase()).toBe(hex);
  });
});
