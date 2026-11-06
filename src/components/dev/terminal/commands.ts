import {
  about,
  education,
  experience,
  hero,
  leadership,
  projects,
  socials,
  type TimelineEntry,
} from "../../../data/content";

export type Line =
  | { kind: "prompt"; text: string }
  | { kind: "text"; text: string }
  | { kind: "error"; text: string }
  | { kind: "hint"; text: string }
  | { kind: "link"; text: string; href: string; external?: boolean };

export type SkinName = "default" | "hacker" | "artist" | "shades";

export type Effect =
  | { type: "clear" }
  | { type: "skin"; skin: SkinName }
  | { type: "shades" } // session-only
  | { type: "pet" }
  | { type: "open"; href: string }
  | { type: "ask"; question: string }
  | { type: "play" };

export const SKINS: readonly SkinName[] = ["default", "hacker", "artist", "shades"];

export interface CommandResult {
  lines: Line[];
  effects: Effect[];
  ok: boolean;
}

interface Ctx {
  skin: SkinName;
}

interface Command {
  describe: string;
  run: (arg: string, ctx: Ctx) => CommandResult;
}

export const IDLE_LINES: Line[] = [
  { kind: "prompt", text: "$ whoami" },
  { kind: "text", text: "ahnaf — ai solutions engineer @ bridge builder strategies" },
  { kind: "prompt", text: "$ current --focus" },
  { kind: "text", text: "agentic ai · mcp · full-stack · data pipelines" },
];

export const HINT_LINE: Line = { kind: "hint", text: "try: help · projects · experience · ask" };

const ASK_MAX = 300;

const text = (t: string): Line => ({ kind: "text", text: t });
const jump = (section: string): Line => ({ kind: "link", text: `→ jump to ${section}`, href: `#${section}` });
const out = (lines: Line[], effects: Effect[] = [], ok = true): CommandResult => ({ lines, effects, ok });
const timeline = (entries: readonly TimelineEntry[], section: string): CommandResult =>
  out([...entries.map((e) => text(`${e.duration}  ${e.title} @ ${e.org}`)), jump(section)]);
const skinList = (current: SkinName): Line[] =>
  SKINS.map((s) => text(s === current ? `* ${s}` : `  ${s}`));

const play: Command = {
  describe: "a game with the cat",
  run: () => out([text("the cat stretches…")], [{ type: "play" }]),
};

const email = socials.find((s) => s.href.startsWith("mailto:"))!.href;

const REGISTRY: Record<string, Command> = {
  help: {
    describe: "list commands",
    run: () => out(VISIBLE.map((n) => text(`${n.padEnd(12)}${REGISTRY[n].describe}`))),
  },
  whoami: { describe: "who is this", run: () => out([IDLE_LINES[1]]) },
  experience: { describe: "where i've worked", run: () => timeline(experience, "experience") },
  projects: {
    describe: "things i've built",
    run: () => out([...projects.map((p) => text(`${p.name} — ${p.description.split(". ")[0]}`)), jump("projects")]),
  },
  skills: { describe: "my stack", run: () => out([text(about.stack.join(" · "))]) },
  education: {
    describe: "where i studied",
    run: () => out([text(education.school), text(education.degree), text(education.minor), jump("education")]),
  },
  leadership: { describe: "clubs and roles", run: () => timeline(leadership, "leadership") },
  contact: {
    describe: "get in touch",
    run: () => out([{ kind: "link", text: email.replace(/^mailto:/, ""), href: email }, jump("contact")]),
  },
  socials: {
    describe: "find me online",
    run: () =>
      out(
        socials.map((s): Line =>
          s.href.startsWith("http")
            ? { kind: "link", text: s.label, href: s.href, external: true }
            : { kind: "link", text: s.label, href: s.href },
        ),
      ),
  },
  resume: {
    describe: "open my resume",
    run: () => out([text("opening resume.pdf")], [{ type: "open", href: "/resume.pdf" }]),
  },
  ask: {
    describe: `ask ${hero.name.split(" ")[0].toLowerCase()} a question`,
    run: (arg) =>
      arg === "" || arg.length > ASK_MAX
        ? out([{ kind: "hint", text: `usage: ask <question> (max ${ASK_MAX} characters)` }])
        : out([], [{ type: "ask", question: arg }]),
  },
  skin: {
    describe: "change the cat's look",
    run: (arg, ctx) => {
      const name = arg.toLowerCase();
      if (name === "") return out(skinList(ctx.skin));
      if ((SKINS as readonly string[]).includes(name)) {
        return out([text(`skin set to ${name}`)], [{ type: "skin", skin: name as SkinName }]);
      }
      return out([{ kind: "error", text: `unknown skin '${arg}'` }, ...skinList(ctx.skin)], [], false);
    },
  },
  pet: { describe: "pet the cat", run: () => out([text("purrrr")], [{ type: "pet" }]) },
  play,
  game: play,
  clear: { describe: "clear the screen", run: () => out([], [{ type: "clear" }]) },
  ls: { describe: "list files", run: () => out([text("experience/  projects/  skills.txt  resume.pdf  cat.jpg")]) },
  sudo: {
    describe: "try it",
    run: () =>
      out([{ kind: "error", text: "ahnaf is not in the sudoers file. this incident will be reported." }], [{ type: "shades" }]),
  },
};

export const COMMAND_NAMES: readonly string[] = Object.keys(REGISTRY);

/** Aliases that run but stay out of `help` and tab completion. */
const HIDDEN: ReadonlySet<string> = new Set(["game"]);
const VISIBLE: readonly string[] = COMMAND_NAMES.filter((n) => !HIDDEN.has(n));

function levenshtein(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/** Closest command name within Levenshtein distance 2, or null. */
export function suggest(word: string): string | null {
  const w = word.toLowerCase();
  let best: string | null = null;
  let bestDist = 3;
  for (const name of COMMAND_NAMES) {
    if (Math.abs(name.length - w.length) >= bestDist) continue;
    const d = levenshtein(w, name);
    if (d < bestDist) [best, bestDist] = [name, d];
  }
  return best;
}

/** Command names starting with `prefix`, in registry order. */
export function complete(prefix: string): string[] {
  const p = prefix.toLowerCase();
  return VISIBLE.filter((n) => n.startsWith(p));
}

export function runCommand(input: string, ctx: Ctx): CommandResult {
  const trimmed = input.trim();
  if (trimmed === "") return out([]);
  const space = trimmed.search(/\s/);
  const typed = space === -1 ? trimmed : trimmed.slice(0, space);
  const name = typed.toLowerCase();
  const arg = space === -1 ? "" : trimmed.slice(space).trim();

  if (Object.hasOwn(REGISTRY, name)) return REGISTRY[name].run(arg, ctx);

  const shown = typed.length > 40 ? `${typed.slice(0, 40)}…` : typed;
  const lines: Line[] = [{ kind: "error", text: `command not found: ${shown}` }];
  const near = suggest(name);
  if (near) lines.push({ kind: "hint", text: `did you mean '${near}'?` });
  return out(lines, [], false);
}
