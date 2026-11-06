# Terminal v2 (growing log, cues, cat menu, Cat Dash) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the hero terminal grow while in use, show that it is typeable, give the cat a click menu, and ship a one-button runner game in a dialog.

**Architecture:** All work lives under `src/components/dev/terminal/`. The log height becomes state-driven with a CSS height transition. The cat menu is a small roving-focus component inside the companion's `[data-cat]` subtree. The game is a pure engine (`game/engine.ts`) rendered to a canvas by `game/draw.ts` inside a portalled dialog (`game/CatGame.tsx`), opened either from the cat menu or the new `play` command via a `play` effect.

**Tech Stack:** React 19, TypeScript, Tailwind v4, framer-motion (present), Vitest 5 + Testing Library (jsdom), Playwright (pre-installed) for verification. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-06-terminal-play-design.md`

## Global Constraints

- Default (inactive) view geometry unchanged: card 175 px / CTA top 715.30 at 1440×900; 191 px / 647.69 at 390×844. Inactive log classes stay `h-[9.25rem] min-[24.875rem]:h-[8.25rem] min-[29.8125rem]:h-[7.25rem] sm:h-[8.25rem]`.
- No new npm dependencies.
- Reduced motion: height change instant; idle cursor solid; label fade instant; no game shake or score flash.
- The cat never activates the terminal; the terminal never deactivates because the game dialog took focus.
- Commits use the repository's configured git identity (no `-c user.*`, no author flags).
- Tests under `src` are type-checked by `tsc -b`: import everything explicitly; engine tests run with `// @vitest-environment node`.

## Review Focus

1. Deactivating while the height transition is mid-flight (click in, click out within 260 ms): the log must end at the inactive height with no stuck intermediate value. Pinned in Task 1 test "toggling quickly ends inactive".
2. Opening the game from the `play` command then closing it must leave the terminal active with focus back on the input, not deactivate it. Pinned in Task 6 test "play command keeps the terminal active across the game".
3. Tab-switching mid-game must not let the cat fall through the floor or obstacles pile up (accumulator must clamp dt). Pinned in Task 5 test "a 5 s gap advances at most one frame's worth".
4. The cat menu's Escape must not bubble to the terminal input's Escape handler (which blurs/deactivates). Pinned in Task 4 test "Escape in the menu does not deactivate the terminal".
5. `localStorage` disabled (private mode throws): the game must still open and play. Pinned in Task 6 test "best score storage failure is swallowed".

---

### Task 1: The log grows while active

**Files:**
- Modify: `src/components/dev/terminal/Terminal.tsx` (LOG_HEIGHT constant ~line 16; log div ~line 152; wrapper div ~line 135)
- Modify: `src/components/dev/terminal/Terminal.test.tsx`

**Interfaces:**
- Produces: wrapper `div[role=group]` carries `data-active="true" | "false"`; log element has `data-testid="terminal-log"`. Constants `LOG_HEIGHT` (unchanged) and `LOG_HEIGHT_ACTIVE = "h-[min(22rem,60svh)] sm:h-[22rem]"`, both exported for tests.

- [ ] **Step 1: Write the failing tests** in `Terminal.test.tsx`:

```ts
it("grows while active and shrinks on Escape", async () => {
  render(<Terminal />);
  const log = screen.getByTestId("terminal-log");
  expect(log.className).toContain(LOG_HEIGHT);
  expect(log.className).not.toContain(LOG_HEIGHT_ACTIVE);
  await user.click(screen.getByRole("group"));
  expect(log.className).toContain(LOG_HEIGHT_ACTIVE);
  expect(screen.getByRole("group")).toHaveAttribute("data-active", "true");
  await user.keyboard("{Escape}");
  expect(log.className).toContain(LOG_HEIGHT);
  expect(log.className).not.toContain(LOG_HEIGHT_ACTIVE);
});
it("toggling quickly ends inactive", async () => { /* click, Escape, click, Escape without awaiting timers; assert inactive classes and data-active=false */ });
it("has a height transition that reduced motion removes", () => {
  // className contains "transition-[height]" and "motion-reduce:transition-none"
});
```

- [ ] **Step 2: Run** `npx vitest run src/components/dev/terminal/Terminal.test.tsx` → FAIL (no testid / constants).
- [ ] **Step 3: Implement.** Export `LOG_HEIGHT` and `LOG_HEIGHT_ACTIVE`; log className = `${state.active ? LOG_HEIGHT_ACTIVE : LOG_HEIGHT} transition-[height] duration-[260ms] ease-out motion-reduce:transition-none …existing…`; add `data-testid="terminal-log"`; wrapper `data-active={state.active ? "true" : "false"}`. Extend the existing auto-scroll effect: also listen for `transitionend` on the log (property `height`) and scroll to bottom then; clean up the listener. Update the sr-only description text to end with "The card grows while you type."
- [ ] **Step 4: Run** the file → PASS. Run `npm test` → all pass.
- [ ] **Step 5: Commit** `feat(terminal): log grows to 22rem while active`.

### Task 2: Interactive cues (idle cursor, title-bar label, hover)

**Files:**
- Modify: `src/components/dev/terminal/Terminal.tsx` (title bar ~line 146; inactive prompt branch ~line 190; card wrapper `.rounded-xl` ~line 145)
- Modify: `src/index.css` (add `@keyframes blink { 0%,100% {opacity:1} 50% {opacity:0} }` next to the existing keyframes)
- Modify: `src/components/dev/terminal/Terminal.test.tsx`

**Interfaces:**
- Produces: idle cursor `span[data-testid="idle-cursor"]` (aria-hidden, text `▍`); label `span[data-testid="type-hint"]`; wrapper `.rounded-xl` gets `data-testid="terminal-card"`.

- [ ] **Step 1: Failing tests:**

```ts
it("shows a blinking block cursor only while inactive", async () => {
  render(<Terminal />);
  const c = screen.getByTestId("idle-cursor");
  expect(c).toHaveAttribute("aria-hidden", "true");
  expect(c).toHaveTextContent("▍");
  expect(c.className).toContain("animate-[blink_1s_steps(1)_infinite]");
  expect(c.className).toContain("motion-reduce:animate-none");
  await user.click(screen.getByRole("group"));
  expect(screen.queryByTestId("idle-cursor")).toBeNull();
});
it("shows 'click to type' until the first activation and never again", async () => {
  // present → click → absent → Escape → still absent
});
it("says 'tap to type' on hover-none devices", () => { /* mock matchMedia("(hover: none)") → matches true */ });
it("card has the hover affordance while inactive and a steady accent border while active", async () => {
  // inactive: className contains "hover:border-accent/60" and "cursor-text"; active: contains "border-accent/60"
});
```

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** `everActive` state (`useState(false)`, set true in the activate path). Title bar: `{!state.active && !everActive && <span data-testid="type-hint" className="ml-auto font-mono text-xs text-ink-faint transition-opacity duration-200 motion-reduce:transition-none">{hoverNone ? "tap to type" : "click to type"}</span>}` where `hoverNone` = `useMemo(() => matchMedia("(hover: none)").matches)` guarded for missing `matchMedia`. Inactive prompt: after `{state.input}` render `<span data-testid="idle-cursor" aria-hidden="true" className="text-accent animate-[blink_1s_steps(1)_infinite] motion-reduce:animate-none">▍</span>`. Card wrapper className adds `transition-colors` + (`state.active ? "border-accent/60" : "hover:border-accent/60 cursor-text"`). Keep the cat button `cursor-pointer` (verify it already has it; add if not).
- [ ] **Step 4: Run** file → PASS; `npm test` → PASS.
- [ ] **Step 5: Commit** `feat(terminal): idle cursor, click-to-type label, hover affordance`.

### Task 3: `play` command and effect

**Files:**
- Modify: `src/components/dev/terminal/commands.ts` (`Effect` union ~line 21; `REGISTRY`; `help` output)
- Modify: `src/components/dev/terminal/useTerminal.ts` (`TerminalDeps`; effect switch)
- Modify: `src/components/dev/terminal/commands.test.ts`, `useTerminal.test.ts`

**Interfaces:**
- Produces: `Effect` gains `{ type: "play" }`; command `play` (alias `game`) returns `lines: [{ kind: "text", text: "the cat stretches…" }]`, `effects: [{ type: "play" }]`; `TerminalDeps.onPlay?: () => void` invoked once per `play` effect.

- [ ] **Step 1: Failing tests.** commands.test: `runCommand("play", ctx)` → text and effect above; `runCommand("game", ctx)` identical; `help` output includes a line starting with `play` whose description is `a game with the cat`. useTerminal.test: render hook with `{ onPlay: vi.fn() }`, run `play`, expect `onPlay` called once and the output line present.
- [ ] **Step 2: Run** both files → FAIL.
- [ ] **Step 3: Implement** per Interfaces. Alias via the same registry entry pattern used for existing aliases (if none, add `game` as a second key pointing at the same handler).
- [ ] **Step 4: Run** → PASS; `npm test` → PASS.
- [ ] **Step 5: Commit** `feat(terminal): play command`.

### Task 4: Cat click menu

**Files:**
- Create: `src/components/dev/terminal/CatMenu.tsx`
- Create: `src/components/dev/terminal/CatMenu.test.tsx`
- Modify: `src/components/dev/terminal/Companion.tsx` (props ~line 173; click handling; bubble render)
- Modify: `src/components/dev/terminal/Companion.test.tsx`, `Terminal.tsx` (pass `onPlay`)

**Interfaces:**
- Produces: `export function CatMenu(props: { onPlay(): void; onPet(): void; onNope(): void; onClose(): void }): JSX.Element` — `div[role=menu][aria-label="cat menu"]` with three `button[role=menuitem]` labelled exactly `play a game`, `pet`, `nope`; first item focused on mount; ArrowUp/ArrowDown cycle; Escape → `onClose()` (and `stopPropagation`); click outside (document `pointerdown` not inside the menu) → `onClose()`.
- `Companions` props: remove `onCatClick`; add `onPlay: () => void`; while the menu is open, pose is `look-up`, wander and chatter are suppressed, menu replaces the reaction bubble.
- Consumes: Task 3 nothing; Task 6 will supply `onPlay`.

- [ ] **Step 1: Failing tests.** CatMenu.test: renders three items in order; first focused; ArrowDown moves focus to `pet`, ArrowUp from first wraps to `nope`; Escape calls `onClose` once and the event does not reach a parent `onKeyDown` spy; pointerdown outside calls `onClose`; clicking each item calls its handler. Companion.test: click on the cat opens the menu (`getByRole("menu")`) and `data-pose="look-up"`; choosing `pet` closes the menu and shows the purr pose; `nope` closes and shows `slow-blink`; `play a game` calls `onPlay`; Escape closes the menu and focuses the cat button. Terminal.test: "Escape in the menu does not deactivate the terminal" — activate, click the cat, press Escape → `data-active="true"`, menu gone; and "menu use never activates the terminal" — from inactive, click cat, click `nope` → `data-active="false"`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** Menu lives inside the existing `[data-cat]` wrapper so the terminal's `onCat` guard ignores it. Reuse the bubble styling classes (`bg-surface-2 border border-line font-mono text-xs`), items `min-h-8 px-3 text-left hover:bg-surface focus-visible:outline-accent`. In `Companions`, cat click (`onClick` on the button, after the existing reaction) toggles `menuOpen`; while open set `reactingRef.current = true` and hold the `look-up` pose; on close restore. Enter/Space on the focused cat already triggers click.
- [ ] **Step 4: Run** → PASS; `npm test`; `npx tsc -b`.
- [ ] **Step 5: Commit** `feat(terminal): cat click menu`.

### Task 5: Game engine and sprites (pure)

**Files:**
- Create: `src/components/dev/terminal/game/engine.ts`, `game/gameSprites.ts`, `game/engine.test.ts` (`// @vitest-environment node`)

**Interfaces (produces):**

```ts
export const WORLD = { w: 240, h: 135, ground: 110, catX: 32 } as const;
export type ObstacleKind = "box" | "cucumber";
export interface Obstacle { kind: ObstacleKind; x: number; w: number; h: number }
export interface GameState {
  t: number; distance: number; score: number; best: number;
  speed: number; catY: number; catVy: number; airborne: boolean;
  obstacles: Obstacle[]; nextGap: number; over: boolean; shake: number; lastKind: ObstacleKind | null;
}
export type Rng = () => number; // [0,1)
export function createGame(best: number, rng: Rng): GameState;
export function jump(s: GameState): GameState;            // no-op while airborne or over
export function step(s: GameState, dt: number, rng: Rng): GameState; // dt seconds, caller clamps ≤ 0.05
export function collide(a: Box, b: Box, margin?: number): boolean; // Box = {x,y,w,h}; margin default 2
export const SPEED = { start: 90, perHundred: 4, max: 200 } as const;
export const GAP = { min: 70, max: 140 } as const;
export const JUMP = { apex: 36, durationMs: 560 } as const;
// gameSprites.ts
export const BOX: string[]; export const CUCUMBER: string[]; export const GROUND_DASH: string[];
export const OBSTACLE_SIZE: Record<ObstacleKind, { w: number; h: number }>; // box 14×12, cucumber 18×8
```

- [ ] **Step 1: Failing tests** (`engine.test.ts`): gravity returns the cat to `ground` after a jump within ~0.56 s and never below ground; `jump` while airborne returns the same state; `jump` when `over` is a no-op; `collide` true for overlap beyond the margin, false for a 1 px overlap at the margin; with a seeded rng (`() => 0` then `() => 0.999`), obstacle gaps are within `GAP` and `x` spawns at `WORLD.w`; never two cucumbers consecutively over 50 spawns; speed is `90` at score 0, `94` at 100, capped at `200`; score = `floor(distance/10)`; obstacles passing `x + w < 0` are removed; collision sets `over`, `shake = 0.12`, and `best = max(best, score)`; "a 5 s gap advances at most one frame's worth": `step(s, 5, rng)` equals `step(s, 0.05, rng)` (engine clamps dt to 0.05).
- [ ] **Step 2: Run** `npx vitest run src/components/dev/terminal/game/engine.test.ts` → FAIL.
- [ ] **Step 3: Implement.** Derive gravity from `JUMP`: `v0 = 4*apex/T`, `g = 8*apex/T²` with `T = durationMs/1000`. Spawn when the right-most obstacle's `x + w < WORLD.w - nextGap`; pick kind with rng, re-roll if it equals `lastKind === "cucumber"`. Draw grids for `BOX`, `CUCUMBER`, `GROUND_DASH` using the palette chars (`f`,`s` for the box; `a`,`s` for the cucumber; `f` for dashes).
- [ ] **Step 4: Run** → PASS; `npx tsc -b`.
- [ ] **Step 5: Commit** `feat(terminal): cat dash engine`.

### Task 6: Cat Dash dialog, renderer, and wiring

**Files:**
- Create: `src/components/dev/terminal/game/draw.ts`, `game/CatGame.tsx`, `game/CatGame.test.tsx`, `game/draw.test.ts`
- Modify: `src/components/dev/terminal/Terminal.tsx` (own `gameOpen`; pass `onPlay` to `useTerminal` and `Companions`; skip deactivation while `gameOpen`; render `<CatGame>`), `Terminal.test.tsx`

**Interfaces:**
- Consumes: Task 5 engine; `CAT`, `CAT_SHADES`, `PALETTE`, `toRects` from `sprites.ts`; `CatMenu`/`Companions.onPlay` from Task 4; `onPlay` dep from Task 3.
- Produces:

```ts
// draw.ts
export type Colours = Record<string, string>; // palette char → resolved colour
export function resolvePalette(el: Element): Colours; // getComputedStyle(el).getPropertyValue for each PALETTE token
export function render(ctx: CanvasRenderingContext2D, s: GameState, a: { cat: Sprite /* walk */, hop: Sprite, sleep: Sprite, colours: Colours, frame: number, reduceMotion: boolean }): void;
// CatGame.tsx
export function CatGame(props: { open: boolean; onClose(): void; skin: SkinName; shades: boolean; reduceMotion: boolean; paletteFrom: Element | null; returnFocusTo: HTMLElement | null }): JSX.Element | null;
export const BEST_KEY = "portfolio-cat-best";
```

- [ ] **Step 1: Failing tests.** draw.test (jsdom, mock `getContext` to record `fillRect` calls): `render` paints at least one rect per visible obstacle and the cat; under `reduceMotion` no translate for shake (spy `ctx.translate` not called with shake offsets). CatGame.test (jsdom; mock `HTMLCanvasElement.prototype.getContext` → stub ctx; use fake timers + `requestAnimationFrame` stub): opens with `role="dialog"`, `aria-modal="true"`, title `cat dash`, focus on the canvas wrapper; Escape → `onClose`; close button labelled `close game`; Space dispatches a jump (expose `data-airborne` on the wrapper from state); footer shows `best 000` initially and the stored value when `localStorage[BEST_KEY]="42"` → `best 042`; a collision (drive the engine via a test seam: `data-testid="game"` wrapper with `__state` or an `onState` test prop) shows `game over · <score>` plus `again` (focused) and `close`; `visibilitychange` to hidden shows the `paused` overlay; "best score storage failure is swallowed": `localStorage.setItem` throws → game still reaches game over without error; body has `overflow:hidden` while open and restored after. Terminal.test: "play command keeps the terminal active across the game" — activate, type `play`, Enter → dialog open and `data-active="true"`; Escape → dialog closed, `data-active="true"`, input focused; "opening from the cat menu leaves the terminal inactive" — click cat → `play a game` → dialog; Escape → focus on the cat button, `data-active="false"`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** Portal to `document.body` with `createPortal`. Loop: `requestAnimationFrame` with an accumulator at 1/60 s, dt clamped to 0.05 before `step`. Canvas: logical 240×135, `canvas.width = 240*dpr`, CSS `width:100%; image-rendering: pixelated`. Inputs: keydown Space/ArrowUp/KeyW/Enter on the wrapper, pointerdown on the canvas → `jump`; on `over`, Space/pointerdown → restart. Pause on `document.hidden` or wrapper `focusout` to outside the dialog; resume on next input. Focus trap between the close button and the wrapper (Tab/Shift+Tab). On close: restore body overflow, `returnFocusTo?.focus()`. Best score read once on open, written on game over inside try/catch. In `Terminal.tsx`: `const [gameOpen, setGameOpen] = useState(false)`; `useTerminal({ reduceMotion, onPlay: () => setGameOpen(true) })`; `onBlur` returns early when `gameOpen`; `returnFocusTo` = cat button when opened from the menu, input when opened from the command (track `openedFrom`). Companions hold `sit` while `gameOpen` (new prop `frozen: boolean`).
- [ ] **Step 4: Run** `npm test`, `npx tsc -b`, `npm run build` → all pass.
- [ ] **Step 5: Commit** `feat(terminal): cat dash game dialog`.

### Task 7: README and verification

**Files:**
- Modify: `README.md` ("Terminal and `ask`" section: add `play`, the cat menu, and the game in three lines)
- Create: `docs/superpowers/reports/2026-11-06-terminal-play-verification.md`

- [ ] **Step 1: Build and preview.** `npm run build && npx vite preview --port 4173`.
- [ ] **Step 2: Playwright geometry.** At 1440×900 and 390×844: card height and `View Projects` top equal 175/715.30 and 191/647.69 before any interaction; click the card → log height 352 at 1440 and ≤ 0.6×844 at 390, input `getBoundingClientRect().bottom` ≤ viewport height at 390; press Escape → numbers equal the defaults again. Also with `reducedMotion: "reduce"`: same end states, and `getComputedStyle(log).transitionProperty` is `none`.
- [ ] **Step 3: Cues.** Screenshot the idle card at 1440 (`cues-1440.png`): block cursor visible after `$`, `click to type` in the title bar; emulate `hasTouch` + `(hover: none)` → label reads `tap to type`.
- [ ] **Step 4: Menu and game.** Click the cat → three menu items; `play a game` → dialog; press Space every 400 ms for 3 s → score > 0 and the canvas `toDataURL()` differs from a blank canvas; stop pressing → within 4 s the `game over` overlay appears and `again` has focus; Escape → focus on the cat button, terminal `data-active="false"`. Repeat via the `play` command → terminal stays active and focus returns to the input. Screenshot `game-1440.png` mid-run and `game-390.png`.
- [ ] **Step 5: axe** on the page with the dialog open (install axe-core in the scratchpad only): 0 violations.
- [ ] **Step 6: Record** all numbers and screenshot paths in the report; commit `docs(terminal): v2 verification`.
