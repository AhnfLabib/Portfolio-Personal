# Terminal v2 verification (Task 7)

Date: 2026-11-06. Branch `terminal-play`, base 31058f8 plus the fixes listed below.
Method: `npm run build && npx vite preview --port 4173`, Playwright Chromium (`chromium.launch()`), intro skipped via `sessionStorage["intro-played"]`. Scripts and screenshots live in the session scratchpad:
`/tmp/claude-0/-home-user-portfolio-personal/0ed17ada-4bfe-520e-948e-2e80d823e9d2/scratchpad/` (`geo.mjs`, `play.mjs`, `edge2.mjs`, `stop.mjs`, `cues2.mjs`).

## Fixes made in this task

1. **Log height transition never ran in the browser.** The unlayered `*, *::before, *::after { transition: background-color … }` rule in `src/index.css` beats Tailwind v4 utilities (which sit in `@layer utilities`), so the log's computed `transition-property` was `background-color, border-color, color, fill, stroke`: the height changed instantly and the transitionend scroll never fired. Fix (one class change in `Terminal.tsx`): `transition-[height]!` and `motion-reduce:transition-none!`; the class test in `Terminal.test.tsx` updated to match. After the fix: `transitionProperty` is `height`, and `none` under reduced motion.
2. **Dialog contrast (axe `color-contrast`).** The dialog title (`cat dash`), the footer hint and the paused hint used `text-ink-faint` (#5b6779 on the dialog surface, 3.28:1). Changed to `text-ink-soft` in `CatGame.tsx`.
3. **Flaky Companion test** "re-measures the card on resize": now seeds `Math.random` with the same Park–Miller generator (seed 7) the "every hop step starts with a crouch" test uses.

## 1. Geometry (`geo.mjs`)

| Check | 1440×900 | 390×844 | 1440 reduced | 390 reduced | Result |
|---|---|---|---|---|---|
| Idle card height / `View Projects` top | 175 / 715.30 | 191 / 647.69 | 175 / 715.30 | 191 / 647.69 | PASS |
| Idle log height | 132 | 148 | 132 | 148 | |
| Log 100 ms after click | 307.89 (mid-transition) | 298.98 (mid-transition) | 352 (instant) | 352 (instant) | PASS |
| Active log height | 352 | 352 (≤ 0.6×844 = 506.4) | 352 | 352 | PASS |
| Active card height / CTA top | 395 / 825.30 | 395 / 773.39 | same | same | |
| Input bottom | 579.30 | 548.39 (≤ 844) | 579.30 | 548.39 | PASS |
| Escape → card / CTA / log | 175 / 715.30 / 132 | 191 / 647.69 / 148 | same | same | PASS |
| Fast click → Escape (80 ms): log right after Escape, +90 ms, settled | 261 → 192.47 → 132 | 267.72 → 173.25 → 148 | 132 → 132 → 132 | 148 → 148 → 148 | PASS (no stuck value; card/CTA back to defaults) |
| `transitionProperty` of the log | `height` | `height` | `none` | `none` | PASS (after fix 1) |
| `scrollWidth` | 1440 | 390 | 1440 | 390 | PASS |

## 2. Cues (`cues2.mjs`, `play.mjs`)

| Check | Value | Result |
|---|---|---|
| 1440: label | `click to type`, visible | PASS |
| 1440: idle cursor | 8.4×18 px block, opacity 1 in the screenshot, ends the last idle line (accepted Task 2 deviation) | PASS |
| 390: label / cursor | `click to type`, visible / visible | PASS |
| `hasTouch` + `isMobile` + CDP `hover: none` | `matchMedia("(hover: none)")` true, label `tap to type` | PASS |
| 320×700: label | in DOM, `display: none` | PASS |
| 320×700: title bar height | 41 px; `scrollWidth` 320 | PASS |

Screenshots: `cues-1440.png`, `cues-390.png` (deviceScaleFactor 2).

## 3. Menu and game (`play.mjs`, `stop.mjs`, `edge2.mjs`)

| Check | 1440 | 390 | Result |
|---|---|---|---|
| Click cat → menu items | `play a game`, `pet`, `nope`; focus on `play a game`; terminal `data-active="false"` | same | PASS |
| `play a game` → dialog | opens | opens | PASS |
| Space every 400 ms for 3 s: canvas differs from blank | yes (480×270 backing) | yes | PASS |
| Score at game over | 19 | 19 | PASS (> 0) |
| Stop pressing → `game over` | 185 ms after the 3 s window (1440, cat run); 1709 / 1696 ms after the last press in `stop.mjs` | 1796 ms after the window | PASS (< 5 s) |
| `again` focused at game over | yes | yes | PASS |
| Escape → focus / `data-active` | `the cat` / `false` | `the cat` / `false` | PASS |
| Best score key | `portfolio-cat-best` = `19` | | PASS |
| `play` command → dialog, terminal state | `data-active="true"`, focus in the game | | PASS |
| Escape from command-opened game | `data-active="true"`, focus `terminal input`, log 352 and scrolled to bottom | | PASS |
| Dialog open: `scrollWidth` | 1440 | 390 | PASS |

Note: blind pressing every 400 ms sometimes crashes into an obstacle before 3 s (4 of 6 `stop.mjs` trials); the score was > 0 and `again` had focus in every trial.

**Cat menu at the right edge (390×844).** In real time the cat did not reach the right column within 4 min, so `edge2.mjs` installs Playwright's fake clock and fast-forwards the wander timers (303 s simulated) until the cat's target x > card width − 50 (x = 338 of 358, top-right corner, same column x as the right edge), lets the CSS transition finish, then clicks it. Menu: `data-menu-align="right"`, `data-menu-side="bottom"`, left 284.80, right **390.00**; cat right 390.00; `document.documentElement.scrollWidth` **390**; `scrollTo(200, …)` leaves `scrollX` 0. PASS — the ~16 px overhang past the card lands exactly on the viewport's right edge (the 16 px gutter), so there is no horizontal scroll, but the menu sits flush against the screen edge.

Screenshots: `menu-1440.png`, `menu-390-edge.png`, `game-1440.png` (mid-run), `game-390.png`.

## 4. axe-core 4.10.2 (installed in the scratchpad only)

| State | Scoped to the terminal group / dialog | Whole document |
|---|---|---|
| Idle, 1440 and 390 | 0 | 1: `color-contrast` ×3 (Footer) |
| Menu open, 1440 and 390 | 0 | 1: `color-contrast` (Footer; at 1440 also `#about` heading spans) |
| Dialog open (running), 1440 and 390 | 0 after fix 2 (before: 2 nodes, dialog title and footer hint, 3.28:1) | 1: `color-contrast` (Footer; at 390 also one `#about` span) |

Remaining whole-page violations are outside this work: the Footer's `text-ink-faint` meta line (`.gap-x-3 > span`, 3.28:1 on #0d111b) is pre-existing; the `#about` hits (contrast 1.22–3.39) are elements caught mid scroll-reveal fade, i.e. transient.

## 5. Tests

`npm test` ×3 after the changes: 292/292, 292/292, 292/292. `npm run build` (includes `tsc -b`) clean.

## Follow-ups (not fixed here)

- `src/index.css`: the unlayered `*` colour-transition rule overrides every Tailwind `transition-*` / `duration-*` utility site-wide (about 20 usages, e.g. button `transition-colors duration-200`), contrary to its own comment. Moving it into `@layer base` would fix all of them; it touches the whole site, so it is left for a separate change.
- Footer meta line contrast (`text-ink-faint`, 3.28:1) fails WCAG AA.
- Cat menu at the right column ends flush with the viewport at 390 (0 px margin); the deferred "use the cat's centre for the right cutoff" tweak would not change this. Consider clamping the right-aligned menu to the card's right edge.
- The cat rarely reaches the right column in real time (not seen in 4 min at 390), so the edge menu path is mostly exercised by tests.
