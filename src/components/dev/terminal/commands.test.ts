import { describe, it, expect } from "vitest";
import { experience, projects, about, education, leadership, socials } from "../../../data/content";
import {
  runCommand,
  suggest,
  complete,
  IDLE_LINES,
  HINT_LINE,
  COMMAND_NAMES,
  SKINS,
} from "./commands";

const ctx = { skin: "default" as const };

describe("runCommand", () => {
  it("help lists every visible command once", () => {
    const r = runCommand("help", ctx);
    const visible = COMMAND_NAMES.filter((n) => n !== "game");
    for (const n of visible) expect(r.lines.some((l) => l.text.startsWith(n))).toBe(true);
    expect(r.lines).toHaveLength(visible.length);
    expect(r.ok).toBe(true);
  });
  it("play prints the stretch line and emits a play effect", () => {
    expect(runCommand("play", ctx)).toEqual({
      lines: [{ kind: "text", text: "the cat stretches…" }],
      effects: [{ type: "play" }],
      ok: true,
    });
  });
  it("game is an alias for play", () => {
    expect(runCommand("game", ctx)).toEqual(runCommand("play", ctx));
  });
  it("the game alias is hidden from help and completion", () => {
    expect(runCommand("help", ctx).lines.some((l) => l.text.startsWith("game"))).toBe(false);
    expect(complete("ga")).toEqual([]);
  });
  it("help lists play as a game with the cat", () => {
    const line = runCommand("help", ctx).lines.find((l) => l.text.startsWith("play"));
    expect(line?.text.slice(4).trim()).toBe("a game with the cat");
  });
  it("is case-insensitive and trims", () => {
    expect(runCommand("  WHOAMI ", ctx).lines[0]).toEqual(IDLE_LINES[1]);
  });
  it("experience prints one line per entry plus a jump link", () => {
    const r = runCommand("experience", ctx);
    expect(r.lines.filter((l) => l.kind === "text")).toHaveLength(experience.length);
    expect(r.lines[0].text).toBe(`${experience[0].duration}  ${experience[0].title} @ ${experience[0].org}`);
    expect(r.lines.at(-1)).toMatchObject({ kind: "link", href: "#experience", text: "→ jump to experience" });
  });
  it("projects prints name — first sentence", () => {
    const r = runCommand("projects", ctx);
    expect(r.lines[0].text).toBe(`${projects[0].name} — ${projects[0].description.split(". ")[0]}`);
    expect(r.lines.filter((l) => l.kind === "text")).toHaveLength(projects.length);
    expect(r.lines.at(-1)).toMatchObject({ kind: "link", href: "#projects", text: "→ jump to projects" });
  });
  it("skills joins the stack", () => {
    expect(runCommand("skills", ctx).lines).toEqual([{ kind: "text", text: about.stack.join(" · ") }]);
  });
  it("education prints school, degree, minor and a jump link", () => {
    expect(runCommand("education", ctx).lines).toEqual([
      { kind: "text", text: education.school },
      { kind: "text", text: education.degree },
      { kind: "text", text: education.minor },
      { kind: "link", text: "→ jump to education", href: "#education" },
    ]);
  });
  it("leadership mirrors experience", () => {
    const r = runCommand("leadership", ctx);
    expect(r.lines.filter((l) => l.kind === "text")).toHaveLength(leadership.length);
    expect(r.lines[0].text).toBe(`${leadership[0].duration}  ${leadership[0].title} @ ${leadership[0].org}`);
    expect(r.lines.at(-1)).toMatchObject({ kind: "link", href: "#leadership", text: "→ jump to leadership" });
  });
  it("contact prints the email and a jump link", () => {
    expect(runCommand("contact", ctx).lines).toEqual([
      { kind: "link", text: "ahnaflabib212@gmail.com", href: "mailto:ahnaflabib212@gmail.com" },
      { kind: "link", text: "→ jump to contact", href: "#contact" },
    ]);
  });
  it("socials prints one link per social", () => {
    const r = runCommand("socials", ctx);
    expect(r.lines).toHaveLength(socials.length);
    expect(r.lines[0]).toEqual({ kind: "link", text: "Email", href: "mailto:ahnaflabib212@gmail.com" });
    expect(r.lines[1]).toEqual({ kind: "link", text: "LinkedIn", href: socials[1].href, external: true });
  });
  it("resume opens the pdf", () => {
    const r = runCommand("resume", ctx);
    expect(r.effects).toContainEqual({ type: "open", href: "/resume.pdf" });
    expect(r.lines[0].text).toBe("opening resume.pdf");
  });
  it("skin with no arg lists skins and marks current", () => {
    const r = runCommand("skin", { skin: "hacker" });
    expect(r.lines.map((l) => l.text)).toEqual(SKINS.map((s) => (s === "hacker" ? "* hacker" : `  ${s}`)));
    expect(r.effects).toEqual([]);
  });
  it("skin <name> applies and unknown name lists", () => {
    expect(runCommand("skin artist", ctx).effects).toContainEqual({ type: "skin", skin: "artist" });
    expect(runCommand("SKIN Artist", ctx).effects).toEqual([{ type: "skin", skin: "artist" }]);
    const bad = runCommand("skin purple", ctx);
    expect(bad.effects).toEqual([]);
    expect(bad.ok).toBe(false);
    expect(bad.lines[0]).toEqual({ kind: "error", text: "unknown skin 'purple'" });
    expect(bad.lines.slice(1).map((l) => l.text)).toContain("* default");
  });
  it("pet purrs", () => {
    const r = runCommand("pet", ctx);
    expect(r.effects).toEqual([{ type: "pet" }]);
    expect(r.lines[0].text).toBe("purrrr");
  });
  it("clear emits clear and no lines", () => {
    expect(runCommand("clear", ctx)).toEqual({ lines: [], effects: [{ type: "clear" }], ok: true });
  });
  it("ls prints the fake listing", () => {
    expect(runCommand("ls", ctx).lines[0].text).toBe("experience/  projects/  skills.txt  resume.pdf  cat.jpg");
  });
  it("sudo gives shades and the sudoers line", () => {
    const r = runCommand("sudo rm -rf /", ctx);
    expect(r.effects).toContainEqual({ type: "shades" });
    expect(r.lines[0].text).toBe("ahnaf is not in the sudoers file. this incident will be reported.");
  });
  it("ask with no arg prints usage and no effect", () => {
    const r = runCommand("ask", ctx);
    expect(r.effects).toEqual([]);
    expect(r.lines).toEqual([{ kind: "hint", text: "usage: ask <question> (max 300 characters)" }]);
  });
  it("ask over 300 characters prints usage and no effect", () => {
    const r = runCommand(`ask ${"x".repeat(301)}`, ctx);
    expect(r.effects).toEqual([]);
    expect(r.lines[0].kind).toBe("hint");
  });
  it("ask with text emits the ask effect", () => {
    expect(runCommand("ask what do you do", ctx).effects).toEqual([{ type: "ask", question: "what do you do" }]);
  });
  it("unknown command with a near miss suggests", () => {
    const r = runCommand("projetcs", ctx);
    expect(r.ok).toBe(false);
    expect(r.lines[0].text).toBe("command not found: projetcs");
    expect(r.lines[1].text).toBe("did you mean 'projects'?");
    expect(runCommand("Projetcs", ctx).lines[0].text).toBe("command not found: Projetcs");
  });
  it("unknown command far from anything does not suggest", () => {
    expect(runCommand("xyzzyplugh", ctx).lines).toHaveLength(1);
  });
  it("survives a 2000-char input", () => {
    const r = runCommand("a".repeat(2000), ctx);
    expect(r.ok).toBe(false);
    expect(r.lines[0].text).toBe(`command not found: ${"a".repeat(40)}…`);
  });
});

describe("constants", () => {
  it("idle and hint lines", () => {
    expect(IDLE_LINES).toEqual([
      { kind: "prompt", text: "$ whoami" },
      { kind: "text", text: "ahnaf — ai solutions engineer @ bridge builder strategies" },
      { kind: "prompt", text: "$ current --focus" },
      { kind: "text", text: "agentic ai · mcp · full-stack · data pipelines" },
    ]);
    expect(HINT_LINE).toEqual({ kind: "hint", text: "try: help · projects · experience · ask" });
  });
});

describe("suggest/complete", () => {
  it("suggests and completes", () => {
    expect(suggest("hlep")).toBe("help");
    expect(suggest("qqqqqqq")).toBeNull();
    expect(complete("ex")).toEqual(["experience"]);
    expect(complete("s")).toEqual(["skills", "socials", "skin", "sudo"]);
  });

  it("never suggests the hidden alias", () => {
    expect(suggest("gam")).not.toBe("game");
    expect(suggest("gmae")).not.toBe("game");
  });
});
