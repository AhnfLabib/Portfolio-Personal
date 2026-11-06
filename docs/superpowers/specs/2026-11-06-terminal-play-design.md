# Terminal v2: room to type, an obvious invitation, and a cat that plays

Date: 2026-11-06. Branch `terminal-play` off `main` (which has the interactive terminal, PR #5).
Extends `docs/superpowers/specs/2026-11-05-interactive-terminal-design.md`; everything there still holds unless this file says otherwise.

## Why

The owner's feedback on the live terminal:

1. Output runs past the card's short log, so using it means scrolling inside a small box.
2. In the default view nothing says the card can be typed into.
3. The cat's click is unused. Clicking it should offer a couple of prompts, one of which starts a small game in its own window.

## Hard constraints (unchanged)

- The **default (inactive) view keeps its exact geometry**: card 175 px tall with the "View Projects" CTA at 715.30 px at 1440×900; 191 px / 647.69 px at 390×844. The log height tokens `h-[9.25rem] min-[24.875rem]:h-[8.25rem] min-[29.8125rem]:h-[7.25rem] sm:h-[8.25rem]` stay for the inactive state.
- No new dependencies. framer-motion is already present and may be used for the height transition; the game is plain canvas + requestAnimationFrame.
- Reduced motion is honoured everywhere stated below.
- The cat never steals focus from the terminal; the terminal never activates from a cat interaction.

## 1. The terminal grows when active

**Behaviour**

- Activation (click, focus, Enter on the card) expands the log to `22rem` on `sm` and up, and to `min(22rem, 60svh)` below `sm`, so the input stays on screen above the phone keyboard. Everything below the card moves down.
- It stays expanded while active. Deactivation (Escape in the input, focus leaving the card, click outside) returns the log to the default height; the hero's default geometry is byte-for-byte restored.
- The transition is a `height` animation of 260 ms, ease-out, implemented with CSS transition on the log element between two fixed heights (not `auto`), so the layout below moves with it. Under reduced motion the height changes instantly.
- After the expansion the log scrolls to its bottom (the existing auto-scroll effect runs after the transition end, and once immediately).
- `role="log"` and `aria-live` unchanged. The sr-only description gains "The card grows while you type."

**Implementation**

- `Terminal.tsx`: `LOG_HEIGHT` (inactive) and a new `LOG_HEIGHT_ACTIVE = "h-[min(22rem,60svh)] sm:h-[22rem]"`; the class switches on `state.active`; add `transition-[height] duration-[260ms] ease-out motion-reduce:transition-none`. The card wrapper gets `data-active` for tests.
- No change to `useTerminal`.

**Tests**

- Terminal.test: inactive → log has the inactive classes; after activation → active classes; after Escape → inactive classes again.
- Playwright (verification task): default geometry numbers unchanged at both viewports; after click the log's height is 352 px at 1440 and ≤ 60 svh at 390; after Escape the geometry matches the default again; input stays within the viewport at 390 after activation.

## 2. The invitation: three cues that the card is interactive

None of the cues changes the card's size.

1. **Idle cursor.** In the inactive view a block cursor `▍` (U+258D, `text-accent`) follows the pending prompt `$ ` and blinks with a 1 s step animation (`animate-[blink_1s_steps(1)_infinite]`, keyframes in `index.css`). Under reduced motion it is solid. It is `aria-hidden`. When active, the input's own caret takes over and the block is not rendered.
2. **Title-bar label.** Right-aligned in the title bar: `click to type` in `font-mono text-xs text-ink-faint`. It is rendered only while `state.active` is false **and** the terminal has never been activated this mount (`everActive` ref/state in `Terminal.tsx`). It fades out over 200 ms when activated (opacity transition; instant under reduced motion) and does not return. On touch-only devices (`(hover: none)`) the text reads `tap to type`.
3. **Hover.** The card (`.rounded-xl` wrapper) gets `hover:border-accent/60 cursor-text transition-colors` while inactive; while active the border is `border-accent/60` steadily. The cat button keeps `cursor-pointer` so hovering the cat does not show a text cursor.

**Tests**

- Idle cursor present when inactive, absent when active; `aria-hidden`.
- Label present initially, absent after activation, still absent after deactivation.
- Label text depends on `(hover: none)` match.
- Wrapper has the hover classes while inactive.

## 3. Cat click menu

**Behaviour**

- Hover reactions are unchanged.
- A click or tap on the cat (or Enter/Space while it is focused) opens a **menu bubble** anchored above the cat, replacing the `!` reaction bubble. The cat shows the `look-up` pose while the menu is open.
- The bubble is a `role="menu"` with three `role="menuitem"` buttons: `play a game`, `pet`, `nope`. Styling matches the chatter bubbles (same font, `bg-surface-2`, `border-line`), items stacked, min hit area 32 px tall.
- Keyboard: focus moves to the first item on open; ArrowUp/ArrowDown cycle; Escape closes and returns focus to the cat; Tab closes it and moves on naturally.
- Choosing:
  - `pet` → closes, runs the existing pet reaction (purr + ♥ for the normal beat).
  - `nope` → closes, the cat does the `slow-blink` reaction.
  - `play a game` → closes and opens the game dialog (section 4).
- Click outside closes it. While the menu is open the cat does not wander and cursor chatter is suppressed (same mechanism as `reactingRef`).
- The menu never activates the terminal: it lives inside the `[data-cat]` subtree, which the terminal's focus/click handlers already ignore.
- The `play` terminal command (new, alias `game`) prints `the cat stretches…` and opens the same dialog via a new effect `{ type: "play" }`. `help` lists it.

**Implementation**

- `Companion.tsx`: new state `menuOpen`; new `CatMenu` subcomponent (own file `CatMenu.tsx`) that owns the roving focus; `Companions` gets a new prop `onPlay: () => void`. The existing `onCatClick` prop is removed (it was the placeholder for this).
- `Terminal.tsx` owns `gameOpen` state and renders `<CatGame open onClose skin shades reduceMotion />`. `useTerminal` handles effect `play` by calling an `onPlay` callback passed in options (keeps the hook free of UI state). `deactivate` is **not** triggered by the game opening: the dialog is portalled to `document.body`, so the card's `onBlur` sees `relatedTarget` outside the card; `Terminal.tsx` skips deactivation while `gameOpen`.

**Tests**

- Click opens the menu with three items; first item focused; Escape closes and focuses the cat.
- `pet` and `nope` trigger their reactions (data-pose assertions).
- `play a game` calls `onPlay`.
- `play` command: `help` lists it; running it yields effect `play`; `useTerminal` invokes `onPlay`.
- Terminal does not activate when the menu is used (`data-active` stays false).

## 4. Cat Dash: a one-button runner

A Chrome-dino-style runner, not a flapper: the cat runs along the ground and jumps over obstacles. One control works for keyboard, mouse and touch.

**Window**

- A `<dialog>`-like modal rendered with a portal into `document.body`: backdrop `bg-bg/70 backdrop-blur-sm`, panel `border-line bg-surface rounded-xl shadow-2xl`, title bar in the terminal's style with `cat dash` on the left and a `×` close button (aria-label "close game") on the right, then the canvas, then a one-line mono footer: `space / tap to jump · esc to close · best 000`.
- Panel width `min(480px, 100vw − 2rem)`; canvas logical size **240×135**, drawn with `image-rendering: pixelated` and scaled to the panel width (2× at 480). Device pixel ratio is respected for crispness (`canvas.width = 240 * dpr`, drawing scaled by dpr).
- `role="dialog" aria-modal="true" aria-labelledby` the title; focus moves to the canvas wrapper (tabIndex 0) on open; Tab is trapped between the close button and the canvas; Escape closes; closing returns focus to the cat button (or the terminal input if opened by the `play` command). Body scroll is locked while open.
- The companion on the card holds the `sit` pose while the game is open (no wander, no chatter).

**Game rules**

- World: ground line at y = 110; the cat (reusing `CAT[skin]` sprite grids, `walk` frames for the run cycle, `hop` while airborne, `sleep` on game over; `CAT_SHADES` when `shades` is on) stands at x = 32.
- Jump: Space, ArrowUp, W, click or tap anywhere on the canvas, or Enter on the canvas wrapper. Initial velocity gives a jump of 36 px apex; gravity constant tuned so the jump lasts ~560 ms. Holding does nothing extra (no variable jump). Input while airborne is ignored.
- Obstacles: two kinds, both drawn from small pixel grids in `gameSprites.ts` with the shared `PALETTE`: a **box** (14×12, `f`/`s` tones) and a **cucumber** (18×8, `a` tone, the cat-and-cucumber joke). Spawn with a random gap of 70–140 px of distance, never two cucumbers in a row. Collision uses axis-aligned boxes shrunk by 2 px on each side so near-misses feel fair.
- Speed starts at 90 px/s and ramps +4 px/s every 100 points, capped at 200 px/s. Score = floor(distance / 10), shown top-right in the mono font (drawn on canvas). The score ticks visibly every 100 (a short flash of the digits).
- Game over on collision: a 120 ms screen shake (skipped under reduced motion), the cat `sleep`s, overlay text `game over · <score>` and `again` / `close` buttons (real DOM buttons below the canvas, not canvas hit-testing; `again` is focused). Space or tap restarts.
- Best score persisted in `localStorage["portfolio-cat-best"]` (integer); shown in the footer and updated on game over; storage failures are swallowed.
- Loop: fixed-step update (1/60 s, accumulator) inside requestAnimationFrame; paused when `document.hidden` or the dialog loses focus, with a `paused` overlay; resumes on focus with a 500 ms "3·2·1" is **not** required — resume immediately on the next input.
- Reduced motion: the game runs (it is user-initiated), no shake, no score flash. Parallax ground dashes still scroll since they are the game.
- Sound: none.

**Implementation**

- `src/components/dev/terminal/game/`:
  - `engine.ts` — pure, testable: `createGame(seed)`, `step(state, dt, input)`, `collide(a, b)`, spawn logic with an injectable RNG; no DOM.
  - `gameSprites.ts` — box and cucumber grids, ground dash pattern.
  - `draw.ts` — `render(ctx, state, assets)` using `toRects`-style grid painting onto canvas with the palette resolved to real colours (read from `getComputedStyle(document.documentElement)` once per open so skins/tokens apply).
  - `CatGame.tsx` — the dialog, input wiring, rAF loop, pause/resume, best score.
- Skins are sprite recolours (`CAT[skin]`, `CAT_SHADES[skin]` are already remapped grids), so the game uses those grids directly; `draw.ts` resolves the five `PALETTE` tokens (`var(--color-ink)` etc.) to real colours once per open via `getComputedStyle` on the terminal wrapper element passed in, and draws every grid cell as a filled rect.

**Tests**

- `engine.test.ts` (node env): gravity brings the cat back to the ground; a jump input while airborne is ignored; collision true/false cases with the shrink margin; obstacles spawn within the gap range using a seeded RNG; never two cucumbers consecutively; speed ramps and caps; score from distance.
- `CatGame.test.tsx` (jsdom; canvas context mocked): opens with focus on the canvas wrapper; Escape calls `onClose`; close returns focus; Space triggers a jump (engine state exposed via a test-only `data-` attribute or a ref callback); game over shows `again`/`close` and writes best score; pause on `visibilitychange`.
- Playwright (verification task): open via cat menu and via `play`; play for 3 s with periodic Space presses, assert the score increases and the canvas is non-blank; force a collision by not jumping, assert the overlay; Escape returns focus to the cat; terminal stays inactive when opened from the cat and stays active when opened from `play`; body does not scroll while open.

## Out of scope

- Sound, leaderboards, sharing, difficulty settings, more than two obstacle kinds.
- Any change to the Artist page or to the `ask` API.
