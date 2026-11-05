# Interactive Hero Terminal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Dev hero's fake terminal card with a real, typeable terminal that answers scripted commands from `content.ts`, one `ask` command backed by a Vercel function calling Gemini, and two pixel companions (Ahnaf + cat) on the card's title bar.

**Architecture:** Pure command logic (`commands.ts`) returns `Line[]` plus side-effect descriptors; a `useTerminal` hook owns state and runs effects; `Terminal.tsx` renders a fixed-height card; `Companion.tsx` renders sprite grids as SVG and maps terminal state to moods. `api/ask.ts` is the only server code: a Web-standard `fetch` handler that validates, rate-limits, and calls Gemini's REST endpoint.

**Tech Stack:** React 19, TypeScript, Tailwind v4, framer-motion (already present), Vitest 5 + jsdom + Testing Library (new, dev only), Vercel Node functions (Web `Request`/`Response` signature, no `@vercel/node` dependency).

**Spec:** `docs/superpowers/specs/2026-11-05-interactive-terminal-design.md`

## Global Constraints

- Idle card must look pixel-identical to today's (`DevHero.tsx:97-128`): same title bar, same two lines, same classes.
- Card outer height is identical in idle and active states; nothing below the card moves.
- No motion in idle state. All companion motion starts from a visitor action and is ≤3 s; blink is a fixed 4 s cycle while active only.
- Copy is plain: each message says what happened, then what to do. Exact strings are in the spec's command table and `ask` section; copy them verbatim.
- Sprites use only the tokens `ink`, `ink-soft`, `ink-faint`, `accent`, `bg`, `surface`. Ahnaf ≤24 px tall, cat ≤16 px.
- Gemini model id: `gemini-3.1-flash-lite`, in one exported constant. Key only from `process.env.GEMINI_API_KEY`. Never log the question or the key.
- Caps: question ≤300 chars; client 10/day (local calendar day) in `localStorage` key `portfolio-ask-quota`; server 20/hour/IP; client timeout 15 s; server upstream timeout 15 s; `maxOutputTokens: 300`.
- Skin persisted in `localStorage` key `portfolio-terminal-skin`.
- `prefers-reduced-motion`: output appears instantly, companions are static, no walking.
- Every `localStorage` access is wrapped in try/catch and the feature works without it.
- Commit after every task with the attribution lines the session requires.

## Review Focus

1. A visitor pastes a 2,000-character blob into the prompt and presses Enter: the terminal must print `command not found` for the first word (no crash, no layout break from a long unbroken string). Test in Task 2 (`runCommand` with a 2,000-char input) and Task 6 (CSS `overflow-wrap: anywhere` on log lines).
2. `ask` typed with no network: the fetch rejects immediately; the terminal must print the offline line and leave the thinking mood within 100 ms, not after 15 s. Test in Task 3 (`askServer` rejects → `{ok:false}`) and Task 4 (effect runner maps to the offline line).
3. The 10/day quota must not be consumed by an `ask` that fails validation (empty or >300 chars). Test in Task 3.
4. Two rapid Enter presses while a command is still typing out must queue, not interleave output. Test in Task 4 (`run` while `busy` returns without appending a second prompt line).
5. `api/ask.ts` receiving a non-JSON body, or JSON without a string `question`, must return 400 with `{error}` and never call the provider. Test in Task 7.

---

### Task 1: Test harness and `api/` typing

**Files:**
- Modify: `package.json` (scripts + devDependencies)
- Create: `vitest.config.ts`, `tsconfig.api.json`, `src/test/setup.ts`
- Modify: `tsconfig.json` (add `./tsconfig.api.json` reference)
- Test: `src/test/smoke.test.ts`

**Interfaces:**
- Produces: `npm test` (vitest run), `npm run test:watch`; jsdom environment for `src/**/*.test.ts(x)`, node environment for `api/**/*.test.ts`.

- [ ] **Step 1: Install dev dependencies**

Run: `npm i -D vitest@^5 jsdom@^31 @testing-library/react@^16 @testing-library/jest-dom@^6 @testing-library/user-event@^14 @types/node@^22`

- [ ] **Step 2: Write `vitest.config.ts`**

Use `defineConfig` from `vitest/config` with the same `react()` and `tailwindcss()` plugins as `vite.config.ts`; `test.environment: "jsdom"`, `test.setupFiles: ["src/test/setup.ts"]`, `test.environmentMatchGlobs: [["api/**", "node"]]`, `test.include: ["src/**/*.test.{ts,tsx}", "api/**/*.test.ts"]`.

`src/test/setup.ts` imports `@testing-library/jest-dom/vitest`.

- [ ] **Step 3: Write `tsconfig.api.json`**

`compilerOptions`: `target ES2023`, `lib ["ES2023", "DOM"]`, `module ESNext`, `moduleResolution bundler`, `types ["node"]`, `strict true`, `noEmit true`, `verbatimModuleSyntax true`, `skipLibCheck true`; `include: ["api"]`. Add `{ "path": "./tsconfig.api.json" }` to `tsconfig.json` references.

- [ ] **Step 4: Write the smoke test**

```ts
// src/test/smoke.test.ts
import { describe, it, expect } from "vitest";
describe("harness", () => { it("runs", () => { expect(1 + 1).toBe(2); }); });
```

- [ ] **Step 5: Add scripts and run**

`"test": "vitest run"`, `"test:watch": "vitest"`. Run: `npm test` → Expected: 1 passed. Run: `npm run build` → Expected: still succeeds.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts tsconfig.api.json tsconfig.json src/test
git commit -m "test: add vitest harness and api tsconfig"
```

---

### Task 2: Command registry (`commands.ts`)

**Files:**
- Create: `src/components/dev/terminal/commands.ts`
- Test: `src/components/dev/terminal/commands.test.ts`

**Interfaces:**
- Consumes: `experience`, `projects`, `about`, `education`, `leadership`, `socials`, `hero` from `src/data/content.ts`.
- Produces:
  ```ts
  export type Line =
    | { kind: "prompt"; text: string }                 // "$ whoami"
    | { kind: "text"; text: string }
    | { kind: "error"; text: string }
    | { kind: "hint"; text: string }                   // dimmed
    | { kind: "link"; text: string; href: string; external?: boolean };
  export type Effect =
    | { type: "clear" }
    | { type: "skin"; skin: SkinName }
    | { type: "shades" }                               // session-only
    | { type: "pet" }
    | { type: "open"; href: string }
    | { type: "ask"; question: string };
  export type SkinName = "default" | "hacker" | "artist" | "shades";
  export const SKINS: readonly SkinName[];
  export interface CommandResult { lines: Line[]; effects: Effect[]; ok: boolean }
  export const IDLE_LINES: Line[];                     // the two pre-run lines, as prompt+text pairs
  export const HINT_LINE: Line;                        // kind "hint", text "try: help · projects · experience · ask"
  export const COMMAND_NAMES: readonly string[];
  export function runCommand(input: string, ctx: { skin: SkinName }): CommandResult;
  export function suggest(word: string): string | null; // closest COMMAND_NAME within Levenshtein ≤ 2
  export function complete(prefix: string): string[];  // COMMAND_NAMES starting with prefix
  ```

- [ ] **Step 1: Write the failing tests**

```ts
import { runCommand, suggest, complete, IDLE_LINES, COMMAND_NAMES } from "./commands";
const ctx = { skin: "default" as const };

it("help lists every command once", () => {
  const r = runCommand("help", ctx);
  for (const n of COMMAND_NAMES) expect(r.lines.some(l => l.text.startsWith(n))).toBe(true);
  expect(r.ok).toBe(true);
});
it("is case-insensitive and trims", () => {
  expect(runCommand("  WHOAMI ", ctx).lines[0]).toEqual(IDLE_LINES[1]);
});
it("experience prints one line per entry plus a jump link", () => {
  const r = runCommand("experience", ctx);
  expect(r.lines.filter(l => l.kind === "text")).toHaveLength(experience.length);
  expect(r.lines.at(-1)).toMatchObject({ kind: "link", href: "#experience" });
});
it("projects prints name — first sentence", () => {
  const r = runCommand("projects", ctx);
  expect(r.lines[0].text).toBe(`${projects[0].name} — ${projects[0].description.split(". ")[0]}`);
});
it("resume opens the pdf", () => {
  const r = runCommand("resume", ctx);
  expect(r.effects).toContainEqual({ type: "open", href: "/resume.pdf" });
  expect(r.lines[0].text).toBe("opening resume.pdf");
});
it("skin with no arg lists skins and marks current", () => {
  const r = runCommand("skin", { skin: "hacker" });
  expect(r.lines.map(l => l.text)).toContain("* hacker");
});
it("skin <name> applies and unknown name lists", () => {
  expect(runCommand("skin artist", ctx).effects).toContainEqual({ type: "skin", skin: "artist" });
  expect(runCommand("skin purple", ctx).effects).toEqual([]);
});
it("sudo gives shades and the sudoers line", () => {
  const r = runCommand("sudo rm -rf /", ctx);
  expect(r.effects).toContainEqual({ type: "shades" });
  expect(r.lines[0].text).toBe("ahnaf is not in the sudoers file. this incident will be reported.");
});
it("ask with no arg prints usage and no effect", () => {
  expect(runCommand("ask", ctx).effects).toEqual([]);
});
it("ask with text emits the ask effect", () => {
  expect(runCommand("ask what do you do", ctx).effects).toEqual([{ type: "ask", question: "what do you do" }]);
});
it("unknown command with a near miss suggests", () => {
  const r = runCommand("projetcs", ctx);
  expect(r.ok).toBe(false);
  expect(r.lines[0].text).toBe("command not found: projetcs");
  expect(r.lines[1].text).toBe("did you mean 'projects'?");
});
it("unknown command far from anything does not suggest", () => {
  expect(runCommand("xyzzyplugh", ctx).lines).toHaveLength(1);
});
it("survives a 2000-char input", () => {
  const r = runCommand("a".repeat(2000), ctx);
  expect(r.ok).toBe(false);
  expect(r.lines[0].text.length).toBeLessThan(100);  // "command not found: aaaa…" truncated to 40 chars + "…"
});
it("suggest/complete", () => {
  expect(suggest("hlep")).toBe("help");
  expect(suggest("qqqqqqq")).toBeNull();
  expect(complete("ex")).toEqual(["experience"]);
  expect(complete("s")).toEqual(["skills", "socials", "skin", "sudo"]);
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/components/dev/terminal/commands.test.ts` → Expected: FAIL, module not found.

- [ ] **Step 3: Implement `commands.ts`**

Registry as `Record<string, { describe: string; run: (arg: string, ctx) => CommandResult }>` in the spec's table order: `help, whoami, experience, projects, skills, education, leadership, contact, socials, resume, ask, skin, pet, clear, ls`, plus `sudo` matched by prefix. Unknown-command name in the error is truncated to 40 chars + `…`. Levenshtein in-file (≤15 lines). `IDLE_LINES` = the two prompt/text pairs currently in `DevHero.tsx:48-51`.

- [ ] **Step 4: Run tests** → Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/dev/terminal/commands.ts src/components/dev/terminal/commands.test.ts
git commit -m "feat(terminal): scripted command registry"
```

---

### Task 3: `ask` client and daily quota (`ask.ts`)

**Files:**
- Create: `src/components/dev/terminal/ask.ts`
- Test: `src/components/dev/terminal/ask.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const ASK_DAILY_CAP = 10;
  export const ASK_MAX_CHARS = 300;
  export const ASK_TIMEOUT_MS = 15_000;
  export const OFFLINE_LINE = "ask is offline right now — try 'help'";
  export const CAP_LINE = "daily limit reached (10 questions). email me instead → contact";
  export interface Quota { date: string; count: number }       // date = YYYY-MM-DD local
  export function readQuota(storage: Storage | null, now: Date): Quota;
  export function consumeQuota(storage: Storage | null, now: Date): { allowed: boolean; remaining: number };
  export function validateQuestion(q: string): { ok: true; question: string } | { ok: false; reason: "empty" | "long" };
  export type AskResult = { ok: true; answer: string } | { ok: false; reason: "offline" | "cap" | "empty" | "long" };
  export function askServer(question: string, deps: { fetch: typeof fetch; signal?: AbortSignal }): Promise<AskResult>;
  export function ask(raw: string, deps: { fetch: typeof fetch; storage: Storage | null; now: Date }): Promise<AskResult>;
  ```

- [ ] **Step 1: Write the failing tests**

```ts
function memStorage(): Storage { /* Map-backed getItem/setItem/removeItem/clear/key/length */ }
it("quota starts at 0 and resets on a new day", () => {
  const s = memStorage();
  expect(readQuota(s, new Date("2026-11-05T10:00"))).toEqual({ date: "2026-11-05", count: 0 });
  for (let i = 0; i < 10; i++) consumeQuota(s, new Date("2026-11-05T10:00"));
  expect(consumeQuota(s, new Date("2026-11-05T23:59")).allowed).toBe(false);
  expect(consumeQuota(s, new Date("2026-11-06T00:01")).allowed).toBe(true);
});
it("quota works with null storage (never blocks)", () => {
  expect(consumeQuota(null, new Date()).allowed).toBe(true);
});
it("validation rejects empty and >300", () => {
  expect(validateQuestion("   ")).toEqual({ ok: false, reason: "empty" });
  expect(validateQuestion("x".repeat(301))).toEqual({ ok: false, reason: "long" });
});
it("invalid questions do not consume quota", async () => {
  const s = memStorage();
  await ask("", { fetch: vi.fn(), storage: s, now: new Date() });
  expect(readQuota(s, new Date()).count).toBe(0);
});
it("askServer maps a rejecting fetch to offline immediately", async () => {
  const t = Date.now();
  const r = await askServer("hi", { fetch: vi.fn().mockRejectedValue(new Error("net")) });
  expect(r).toEqual({ ok: false, reason: "offline" });
  expect(Date.now() - t).toBeLessThan(100);
});
it("askServer maps non-200 and bad JSON to offline, 200 {answer} to ok", async () => {
  const bad = vi.fn().mockResolvedValue(new Response("nope", { status: 503 }));
  expect(await askServer("hi", { fetch: bad })).toEqual({ ok: false, reason: "offline" });
  const good = vi.fn().mockResolvedValue(Response.json({ answer: "I build things." }));
  expect(await askServer("hi", { fetch: good })).toEqual({ ok: true, answer: "I build things." });
  expect(good).toHaveBeenCalledWith("/api/ask", expect.objectContaining({ method: "POST" }));
});
it("ask over the cap returns cap without calling fetch", async () => {
  const s = memStorage(); const f = vi.fn();
  for (let i = 0; i < 10; i++) consumeQuota(s, new Date());
  expect(await ask("hi", { fetch: f, storage: s, now: new Date() })).toEqual({ ok: false, reason: "cap" });
  expect(f).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run to verify they fail** → Expected: FAIL, module not found.

- [ ] **Step 3: Implement `ask.ts`**

`ask` order: validate → quota → `askServer` with an `AbortController` timed at `ASK_TIMEOUT_MS`. `askServer` posts `JSON.stringify({ question })` with `Content-Type: application/json`; any throw, non-`ok` status, or body without a string `answer` → `offline`.

- [ ] **Step 4: Run tests** → Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/dev/terminal/ask.ts src/components/dev/terminal/ask.test.ts
git commit -m "feat(terminal): ask client with daily quota"
```

---

### Task 4: Terminal state hook (`useTerminal.ts`)

**Files:**
- Create: `src/components/dev/terminal/useTerminal.ts`
- Test: `src/components/dev/terminal/useTerminal.test.ts` (renderHook from Testing Library)

**Interfaces:**
- Consumes: Task 2 (`runCommand`, `IDLE_LINES`, `HINT_LINE`, `complete`, `SkinName`), Task 3 (`ask`, `OFFLINE_LINE`, `CAP_LINE`).
- Produces:
  ```ts
  export type Mood = "idle" | "typing" | "thinking" | "happy" | "confused";
  export interface TerminalState {
    active: boolean; lines: Line[]; input: string; busy: boolean;
    skin: SkinName; shades: boolean; mood: Mood; petTick: number; showHint: boolean;
  }
  export interface TerminalApi {
    activate(): void; deactivate(): void;
    setInput(v: string): void; submit(): void;
    historyUp(): void; historyDown(): void; tabComplete(): void; clear(): void;
    finishTyping(): void;                               // skip typewriter
  }
  export function useTerminal(deps?: { fetch?: typeof fetch; storage?: Storage | null; reduceMotion?: boolean; now?: () => Date; typeDelayMs?: number }): [TerminalState, TerminalApi];
  ```
- Typewriter: output lines are appended one at a time, `typeDelayMs` (default 1.5 ms × chars, min 30 ms per line, 0 when `reduceMotion`), so the log grows line by line; `finishTyping` flushes.
- Moods: `typing` while `input` non-empty and active; `thinking` while `busy`; `happy` for 1500 ms after `ok` result or `pet`; `confused` for 2000 ms after `!ok`; otherwise `idle`.
- `deactivate()` sets `active=false` only if `lines` equals `IDLE_LINES` (nothing run yet); otherwise keeps lines, sets `active=false` anyway but `showHint=false`.

- [ ] **Step 1: Write the failing tests**

```ts
it("starts idle with the two idle lines and no hint", () => {
  const [s] = renderHook(() => useTerminal({ reduceMotion: true })).result.current;
  expect(s.active).toBe(false); expect(s.lines).toEqual(IDLE_LINES); expect(s.showHint).toBe(false);
});
it("activate shows the hint; first submit hides it", async () => { /* act(activate); expect showHint true; setInput("help"); submit; await waitFor(() => busy false); expect showHint false */ });
it("submit appends a prompt line then the command output", async () => { /* lines contain {kind:"prompt", text:"$ help"} followed by help output */ });
it("history up/down walks previous inputs and resets on submit", async () => { /* run "help","skills"; historyUp → input "skills"; historyUp → "help"; historyDown → "skills"; historyDown → "" */ });
it("tab completes a unique prefix", () => { /* setInput("exp"); tabComplete → "experience" */ });
it("clear empties lines (not back to idle lines)", async () => { /* after a command, clear → lines [] */ });
it("skin effect persists to storage; shades does not", async () => { /* "skin hacker" → storage key portfolio-terminal-skin == "hacker"; "sudo x" → state.shades true, storage unchanged */ });
it("ask: busy during fetch, offline line on failure, mood confused", async () => { /* fetch rejects → lines end with {kind:"error", text: OFFLINE_LINE}; busy false within 100ms */ });
it("submit while busy is ignored (no second prompt line)", async () => { /* typeDelayMs: 50, submit "help" twice quickly → exactly one "$ help" prompt line */ });
it("pet bumps petTick and sets happy", () => {});
```

- [ ] **Step 2: Run to verify they fail** → Expected: FAIL.

- [ ] **Step 3: Implement `useTerminal.ts`**

`useReducer` for state; effects run in `submit` after `runCommand`: `clear` → `lines=[]`; `skin` → set + try `storage.setItem`; `shades` → `shades=true`; `pet` → `petTick++`, mood happy; `open` → `window.open(href, "_blank", "noopener")`; `ask` → `busy=true`, await `ask(...)`, append `{kind:"text", text:answer}` or `{kind:"error", text: OFFLINE_LINE|CAP_LINE}` (`empty`/`long` → `{kind:"hint", text:"usage: ask <question> (max 300 characters)"}`). Initial skin from `storage.getItem("portfolio-terminal-skin")` if in `SKINS`. Typewriter via `setTimeout` chain stored in a ref; cleared on unmount and by `finishTyping`.

- [ ] **Step 4: Run tests** → Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/dev/terminal/useTerminal.ts src/components/dev/terminal/useTerminal.test.ts
git commit -m "feat(terminal): state hook with history, effects and typewriter"
```

---

### Task 5: Sprites and companions (`sprites.ts`, `Companion.tsx`)

**Files:**
- Create: `src/components/dev/terminal/sprites.ts`, `src/components/dev/terminal/Companion.tsx`
- Test: `src/components/dev/terminal/sprites.test.ts`, `src/components/dev/terminal/Companion.test.tsx`

**Interfaces:**
- Consumes: `Mood`, `SkinName` (Tasks 2, 4).
- Produces:
  ```ts
  // sprites.ts
  export type Palette = Record<string, string>;         // char → CSS var, e.g. { "#": "var(--color-ink)", "a": "var(--color-accent)", "s": "var(--color-ink-soft)", "f": "var(--color-ink-faint)", "b": "var(--color-bg)" }; "." = transparent
  export interface Sprite { w: number; h: number; frames: string[][] }  // each frame = h strings of w chars
  export type AhnafPose = "idle" | "blink" | "typing" | "thinking" | "happy" | "confused" | "shades";
  export type CatPose = "sleep" | "awake" | "stretch" | "walk1" | "walk2" | "purr" | "shades";
  export const AHNAF: Record<SkinName, Record<AhnafPose, Sprite>>;  // 24×24 max
  export const CAT: Record<SkinName, Record<CatPose, Sprite>>;      // 20×16 max
  export const PALETTE: Palette;
  export function toRects(frame: string[], palette: Palette): { x: number; y: number; fill: string }[];
  // Companion.tsx
  export function Companions(props: { mood: Mood; skin: SkinName; shades: boolean; active: boolean; petTick: number; reduceMotion: boolean }): JSX.Element;
  ```
- Each sprite renders as `<svg viewBox="0 0 w h" shape-rendering="crispEdges">` of `<rect width=1 height=1>`s; `aria-hidden="true"`.
- Timers inside `Companions`: blink every 4000 ms for 150 ms while `active && !reduceMotion`; cat `stretch` for 800 ms on `active` rising edge; cat walk: while `active && !reduceMotion`, every 30 000 ms, alternate `walk1/walk2` every 150 ms while translating across the title-bar width and back over 3000 ms; `purr` for 2000 ms on `petTick` change; `shades` pose overrides when `shades`.

- [ ] **Step 1: Write the failing tests**

```ts
// sprites.test.ts
it("every sprite frame is rectangular and within bounds", () => {
  for (const skin of SKINS) for (const pose of Object.keys(AHNAF[skin])) {
    const s = AHNAF[skin][pose]; expect(s.h).toBeLessThanOrEqual(24); expect(s.w).toBeLessThanOrEqual(24);
    for (const f of s.frames) { expect(f).toHaveLength(s.h); for (const row of f) expect(row).toHaveLength(s.w); }
  }
  /* same for CAT with 20×16 */
});
it("frames only use palette chars or '.'", () => { /* every char ∈ Object.keys(PALETTE) ∪ {"."} */ });
it("toRects skips '.' and maps colours", () => {
  expect(toRects(["#.", ".a"], PALETTE)).toEqual([{ x: 0, y: 0, fill: "var(--color-ink)" }, { x: 1, y: 1, fill: "var(--color-accent)" }]);
});
// Companion.test.tsx (fake timers)
it("idle inactive: no blink after 10s", () => { /* render active=false; advance 10s; the ahnaf svg's rect set is unchanged */ });
it("active: blinks at 4s for 150ms", () => { /* data-pose attribute on the svg flips to "blink" at 4000ms and back by 4200ms */ });
it("reduceMotion: never blinks, never walks", () => {});
it("shades prop overrides pose", () => { /* data-pose === "shades" */ });
it("petTick change shows purr for 2s", () => {});
```

- [ ] **Step 2: Run to verify they fail** → Expected: FAIL.

- [ ] **Step 3: Draw the sprites in `sprites.ts`**

Four skins × poses for both characters. Default Ahnaf: black hair with the swoop, round glasses (`#` frames with `b` lenses), goatee; skins change: `hacker` hood (`s` fill) + black cat with `a` eyes; `artist` beret (`a`) + cat with a `a` brush pixel at the mouth; `shades` two-pixel dark lenses on both. Keep each pose a 1-frame array except `walk1/walk2`. Expose `data-pose` on each svg for tests.

- [ ] **Step 4: Implement `Companion.tsx`**

Absolutely positioned wrapper `className="pointer-events-none absolute -top-5 right-6 flex items-end gap-1"`; Ahnaf svg `h-6` (24 px), cat `h-4` (16 px); cat wrapper gets `style={{ transform: translateX(…) }}` during walk via `requestAnimationFrame`-free CSS transition (`transition: transform 1500ms linear`), toggled by state.

- [ ] **Step 5: Run tests** → Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/dev/terminal/sprites.ts src/components/dev/terminal/Companion.tsx src/components/dev/terminal/*.test.ts*
git commit -m "feat(terminal): pixel companions with skins and moods"
```

---

### Task 6: Terminal card UI and hero integration (`Terminal.tsx`, `DevHero.tsx`)

**Files:**
- Create: `src/components/dev/terminal/Terminal.tsx`
- Modify: `src/components/dev/DevHero.tsx:44-128` (remove `TerminalLine`, `TERMINAL_LINES`, the inline card; render `<Terminal />`)
- Test: `src/components/dev/terminal/Terminal.test.tsx`

**Interfaces:**
- Consumes: Tasks 4, 5.
- Produces: `export default function Terminal(): JSX.Element`.

- [ ] **Step 1: Write the failing tests**

```tsx
it("idle renders the two idle lines, no input, no hint", () => { /* getAllByText for the two prompts; queryByRole("textbox") null */ });
it("click activates: textbox focused, hint line visible", async () => {});
it("Enter runs a command and output appears in the log", async () => { /* role="log" contains "$ help" */ });
it("ArrowUp recalls history; Tab completes; Escape blurs", async () => {});
it("Ctrl+L clears", async () => {});
it("the hint links run commands", async () => { /* click text "projects" inside the hint → log has "$ projects" */ });
it("card has the fixed-height classes and the log has overflow-wrap anywhere", () => {});
```

- [ ] **Step 2: Run to verify they fail** → Expected: FAIL.

- [ ] **Step 3: Implement `Terminal.tsx`**

Reuse the exact wrapper and title-bar markup/classes from `DevHero.tsx:97-110`. Body: `div.h-[7.5rem] sm:h-[8.5rem] overflow-y-auto` (measure the idle body's rendered height first and pin to it) with `role="log" aria-live="polite"`, `font-mono text-xs sm:text-sm space-y-3`, `[overflow-wrap:anywhere]`; lines rendered by `kind` (`prompt` → `text-accent`, `text` → `text-ink-soft`, `error` → `text-ink`, `hint` → `text-ink-faint`, `link` → `<a className="text-accent underline-offset-4 hover:underline">`). Prompt row: `$ ` + `<input aria-label="terminal input" className="bg-transparent outline-none flex-1 text-ink caret-accent">` + blinking block cursor (existing motion span from `DevHero.tsx:81-91`). Wrapper is `tabIndex={0}` with `onClick`/`onFocus` → `activate()` and focuses the input; `onBlur` leaving the card → `deactivate()`. `aria-label="Interactive terminal. Click or press Enter to type commands."`. Key map per spec. Auto-scroll the log to bottom on `lines` change. Click on the log → `finishTyping()`. `<Companions …/>` as a child of the outer wrapper (which must be `relative`).

- [ ] **Step 4: Wire into `DevHero.tsx`**

Delete lines 44–51 and replace the `motion.div` card block (97–128) with `<motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.6,delay:0.25,ease:"easeOut"}} className="mt-10 w-full max-w-xl"><Terminal /></motion.div>`.

- [ ] **Step 5: Run tests and build** → `npm test` PASS; `npm run build` succeeds.

- [ ] **Step 6: Browser check**

Run `npx vite preview --port 4173` and the Playwright script pattern from the session's scratchpad: screenshot the hero at 1440×900 and 390×844 in idle, then after clicking the card and running `help`. Expected: the idle screenshot matches the pre-change hero (compare by eye: same card height, same lines); in active state the CTAs below the card do not move.

- [ ] **Step 7: Commit**

```bash
git add src/components/dev/terminal/Terminal.tsx src/components/dev/terminal/Terminal.test.tsx src/components/dev/DevHero.tsx
git commit -m "feat(terminal): interactive card in the dev hero"
```

---

### Task 7: Vercel function (`api/ask.ts`)

**Files:**
- Create: `api/ask.ts`, `api/_context.ts` (system prompt text), `api/ask.test.ts`
- Create: `.env.example` with `GEMINI_API_KEY=`; add `.env*` (except `.env.example`) to `.gitignore`

**Interfaces:**
- Consumes: `experience`, `projects`, `education`, `leadership`, `about`, `socials` from `../src/data/content` (relative import; Vercel bundles it).
- Produces:
  ```ts
  export const MODEL = "gemini-3.1-flash-lite";
  export const RATE_LIMIT = { perHour: 20 };
  export function buildSystemPrompt(): string;                       // api/_context.ts; includes the resume facts and the rules from the spec
  export function checkRate(ip: string, now: number, store?: Map<string, { windowStart: number; count: number }>): boolean;
  export async function callProvider(question: string, deps: { fetch: typeof fetch; apiKey: string; signal: AbortSignal }): Promise<string>;  // throws on any failure
  export default async function handler(req: Request): Promise<Response>;
  ```
- Gemini request: `POST https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent` with header `x-goog-api-key`, body `{ system_instruction: { parts: [{ text }] }, contents: [{ role: "user", parts: [{ text: question }] }], generationConfig: { maxOutputTokens: 300, temperature: 0.4 } }`; answer = `candidates[0].content.parts.map(p => p.text).join("")`.

- [ ] **Step 1: Write the failing tests**

```ts
const post = (body: unknown, ip = "1.1.1.1") => new Request("http://x/api/ask", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip }, body: typeof body === "string" ? body : JSON.stringify(body) });
it("rejects GET with 405", async () => { expect((await handler(new Request("http://x/api/ask"))).status).toBe(405); });
it("rejects non-JSON and missing question with 400 and never calls fetch", async () => { /* spy global fetch; "{not json" → 400; {q:1} → 400; {question: 5} → 400; expect(fetchSpy).not.toHaveBeenCalled() */ });
it("rejects >300 chars with 400", async () => {});
it("503 when GEMINI_API_KEY is unset", async () => { /* vi.stubEnv("GEMINI_API_KEY", "") */ });
it("rate limits the 21st request in an hour per ip with 429", () => { /* checkRate with a fresh Map: 20× true then false; different ip true; +3600001ms true */ });
it("maps provider failure to 502 {error} and success to 200 {answer}", async () => { /* stub fetch: 500 → 502; valid candidates JSON → 200 and body.answer */ });
it("buildSystemPrompt names the current employer and the rules", () => { expect(buildSystemPrompt()).toContain("Bridge Builder Strategies"); expect(buildSystemPrompt()).toMatch(/120 words/); });
```

- [ ] **Step 2: Run to verify they fail** → Run `npx vitest run api` → Expected: FAIL.

- [ ] **Step 3: Implement**

`api/_context.ts`: `buildSystemPrompt()` concatenates a fixed rules block (verbatim from the spec: only about Ahnaf's work, education, skills, contact; ≤120 words; plain text, no markdown; off-topic → one sentence + suggest `help`) and a facts block generated from `content.ts` plus the resume's education/awards/skills lines as a constant string. `api/ask.ts`: method check → JSON parse in try/catch → validate → key check → `checkRate(ip from x-forwarded-for first value, Date.now())` → `callProvider` with a 15 s `AbortController` → `Response.json({answer})`; errors → `Response.json({error: "…"}, {status})`. Module-level `Map` for the rate store. No `console.log` of the question.

- [ ] **Step 4: Run tests and typecheck** → `npm test` PASS; `npx tsc -p tsconfig.api.json` no errors.

- [ ] **Step 5: Commit**

```bash
git add api .env.example .gitignore
git commit -m "feat(api): ask endpoint backed by Gemini with validation and rate limit"
```

---

### Task 8: End-to-end check and docs

**Files:**
- Modify: `README.md` (section "Terminal and `ask`": set `GEMINI_API_KEY` in Vercel → Settings → Environment Variables; local dev with `vercel dev`)

- [ ] **Step 1: Local end-to-end with a stub**

Run `npx vite preview` with a tiny local stub for `/api/ask` (Node `http` server on 4174 returning `{answer:"stub"}`; set Vite preview `proxy` via a temporary `vite.config` override or use the browser's `fetch` mock in Playwright `page.route("**/api/ask", …)`). In Playwright: activate the card, type `ask what do you do`, Enter. Expected: thinking mood during the request (svg `data-pose="thinking"`), then `stub` in the log; with `page.route` aborting the request, the offline line appears within 100 ms.

- [ ] **Step 2: Reduced motion and mobile**

Playwright `emulateMedia({ reducedMotion: "reduce" })`: run `help`; output appears in one frame; companions `data-pose` never changes over 10 s. 390 px: tapping the card focuses the input (`document.activeElement` is the textbox).

- [ ] **Step 3: Full suite and build** → `npm test`, `npm run build`, `npx tsc -p tsconfig.api.json` all clean.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: terminal and ask setup"
```

---

### Task 9: Companions v2 — larger, always animated, roaming cat

**Spec:** the "Revision: companions v2" section at the end of the spec. It
supersedes the Global Constraints lines on companion size and idle motion.

**Files:**
- Modify: `src/components/dev/terminal/sprites.ts` (redraw at the new grid sizes; new cat poses `sit`, `groom`, `tail-flick`, `hop`, `walk1..4`; Ahnaf `breathe1/2`, `look` (head toward prompt))
- Modify: `src/components/dev/terminal/Companion.tsx` (wander state machine, rAF/timer loop, visibility pause, position along the card's edges)
- Modify: `src/components/dev/terminal/Terminal.tsx` only for the wrapper's top clearance / overflow so 48 px sprites are not clipped
- Test: `sprites.test.ts`, `Companion.test.tsx` (update), plus a pure `wander.ts` + `wander.test.ts` for the state machine

**Interfaces:**
- `wander.ts`: `export type WanderState = { phase: "walk" | "sit" | "stretch" | "groom" | "tail" | "sleep" | "hop"; x: number; edge: "top" | "right" | "bottom"; facing: 1 | -1; until: number }`; `export function stepWander(s: WanderState, now: number, bounds: { topWidth: number; rightHeight: number; bottomWidth: number }, rng: () => number): WanderState` — pure; deterministic given `rng`.
- `Companions` keeps its props (`mood, skin, shades, active, petTick, reduceMotion`); `active` now only affects Ahnaf's `look`/typing poses.

- [ ] **Step 1: Write failing tests** — `stepWander`: never leaves bounds; `walk` lasts 1000–3000 ms; rest phases 1000–2000 ms; sleep ~8000 ms occurs within 60 s of simulated time with a fixed rng; `hop` transitions top→right→bottom and back; facing flips with direction. Sprites: bounds ≤32×32 / ≤32×24, palette-only, every pose in every skin. Companion: under `reduceMotion` no timers; with timers running, the cat's `data-pose` changes over 5 s; `document.hidden` pauses (no state change while hidden).
- [ ] **Step 2: Run to verify they fail.**
- [ ] **Step 3: Implement** — redraw sprites at 2× detail; wander loop with `setTimeout` per phase + CSS `transition: transform` per walk leg (`left`/`top` via `translate`), edges mapped to the card's `getBoundingClientRect`-free layout: top edge = `translate(x, 0)`, right edge = `translate(W, y) rotate(90deg)`, bottom edge = `translate(x, H) scaleY(-1)`? No — keep the cat upright: on the right edge it "hops" down in 2–3 steps (translateY) and on the bottom edge walks upright along the card's bottom border (`top: 100%`). Pause on `visibilitychange`.
- [ ] **Step 4: Run tests, `npm run build`, browser check** — 1440 and 390: 10 s screenshots every 2 s show the cat in different positions; nothing clipped; card height and CTA top unchanged from Task 6 numbers (175 / 191 px; CTA top 715.30 / 647.69).
- [ ] **Step 5: Commit.**
