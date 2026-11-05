# Interactive hero terminal with pixel companions

Date: 2026-11-05
Status: approved in conversation, awaiting spec review

## Goal

Turn the Dev hero's fake terminal card into a real, typeable terminal that
answers questions about Ahnaf, with a pair of 8-bit companions (pixel-Ahnaf
and a cat) living on the card. The default appearance must be identical to
the current card; it only becomes interactive when the visitor clicks or
tabs into it.

Scripted commands answer from `src/data/content.ts`. One command, `ask`,
sends a free-form question to a Vercel serverless function backed by the
Gemini free tier.

## Out of scope

- The Artist page. Nothing there changes.
- Any backend beyond the single `api/ask.ts` function.
- Persisting conversations across visits (only the chosen skin and the
  daily `ask` count persist).

## File layout

```
src/components/dev/terminal/
  Terminal.tsx        card UI: title bar, output log, prompt line, chips
  useTerminal.ts      state: idle/active, history, output lines, running command
  commands.ts         command registry; answers built from content.ts
  ask.ts              client for /api/ask and the per-visitor daily cap
  Companion.tsx       renders Ahnaf + cat from sprite data, drives moods
  sprites.ts          pixel art as text grids, per skin and frame
api/ask.ts            Vercel function that calls Gemini
public/resume.pdf     the resume the `resume` command opens
```

`DevHero.tsx` replaces its inline fake terminal with `<Terminal />`. The
`TERMINAL_LINES` constant moves into `commands.ts` as the idle lines.

## Interaction

### States

- **idle** – renders exactly the current card: title bar, the two pre-run
  lines (`whoami`, `current --focus`), no prompt, no chips. Companions sit
  on the title bar.
- **active** – entered by click anywhere on the card, or by keyboard focus
  (the card is a focusable region). A `$ ` prompt line with a blinking
  cursor appears under the two lines, with four suggestion chips: `help`,
  `projects`, `experience`, `ask`. Clicking a chip runs that command (for
  `ask`, it fills the prompt with `ask ` and focuses it).
- Leaving (Esc, or focus moving away) returns to **idle** only if the output
  log is empty; otherwise the card stays active-looking with its output,
  just without the cursor blinking.

### Input

A real `<input>` (visually integrated into the prompt line) receives
keystrokes so mobile keyboards open and screen readers work.

| Key | Action |
|---|---|
| Enter | run the line |
| ↑ / ↓ | walk command history (per session, in memory) |
| Tab | autocomplete the command name to the unique match; cycle on repeat |
| Ctrl+L | clear output (same as `clear`) |
| Esc | blur the input |

### Output

- Output lines append below the prompt history inside the card. The log area
  has `max-height: 40vh` and scrolls; the newest line is kept in view.
- Lines type out at ~1.5 ms/char. Clicking the log while typing finishes
  the current output instantly.
- Link lines (e.g. `→ jump to projects`) are real anchors that scroll to the
  section.

### Accessibility

- The log is `role="log"` with `aria-live="polite"`.
- The card has `aria-label="Interactive terminal. Click or press Enter to type commands."`
- `prefers-reduced-motion`: output appears instantly; companions show static
  idle frames and the cat never walks.

## Commands

All commands are case-insensitive. Arguments after the command name are
passed as a single string.

| Command | Output |
|---|---|
| `help` | list of commands with one-line descriptions |
| `whoami` | the idle `whoami` line |
| `experience` | each `experience` entry: `duration  title @ org`, then `→ jump to experience` |
| `projects` | each project: `name — first sentence of description`, then `→ jump to projects` |
| `skills` | `about.stack` joined with ` · ` |
| `education` | school, degree, minor, then `→ jump to education` |
| `leadership` | each `leadership` entry like `experience`, then `→ jump to leadership` |
| `contact` | email plus `→ jump to contact` |
| `socials` | each `socials` entry as a link |
| `resume` | opens `/resume.pdf` in a new tab and prints `opening resume…` |
| `ask <question>` | see "ask" below; with no argument prints usage |
| `skin` | lists skins, marks the current one |
| `skin <name>` | applies the skin to both companions; unknown name lists skins |
| `pet` | cat purrs (hearts), Ahnaf goes happy; prints `purrrr` |
| `clear` | wipes the log |
| `ls` | fake listing: `experience/  projects/  skills.txt  resume.pdf  cat.jpg` |
| `sudo <anything>` | both companions put on shades; prints `nice try. ahnaf is not in the sudoers file.` |
| `exit` | `there is no escape. (try 'clear')` |
| anything else | `command not found: <x>` plus `did you mean '<closest>'?` when the closest known command is within Levenshtein distance 2 |

Scripted answers are built at call time from `content.ts` so they never go
stale.

## Companions

### Rendering

Sprites are defined in `sprites.ts` as arrays of strings, one character per
pixel, mapped through a small palette (`.` = transparent). Each sprite is
rendered as an inline `<svg>` of `<rect>`s with `shape-rendering: crispEdges`,
scaled with CSS so they stay sharp.

- Ahnaf: 24×24 grid.
- Cat: 20×16 grid.

They are absolutely positioned on the card's top edge so their feet overlap
the title bar; the cat's tail hangs past the card's right edge. They do not
affect layout.

### Moods

Each mood is a frame list; animation cycles frames on a timer.

| Ahnaf | Trigger |
|---|---|
| idle | default; blinks every 3–5 s |
| typing | input has focus and non-empty text |
| thinking | a command is producing output or `ask` is in flight; `…` bubble |
| happy | after any successful command, 1.5 s; after `pet` |
| confused | unknown command, 2 s; head tilt and `?` |

| Cat | Trigger |
|---|---|
| sleeping | default in idle state |
| awake | card active |
| stretch | on entering active, once |
| walk | every ~30 s of inactivity while active, walks across the title bar and back |
| purr | `pet`, 2 s, hearts |

### Skins

`default`, `hacker`, `artist`, `shades`. A skin is a full set of frames for
both characters. The selection is stored in `localStorage` under
`portfolio-terminal-skin` and applied on load. `sudo` applies `shades` for
the session without changing the stored skin.

## `ask`

### Client (`ask.ts`)

- Trims the question; rejects empty or >300 chars with a usage line.
- Daily cap: `localStorage` key `portfolio-ask-quota` storing `{date, count}`;
  10 per calendar day (local time). Over the cap prints
  `you've used today's 10 questions — email me instead → contact`.
- `POST /api/ask` with `{question}`; 15 s timeout via `AbortController`.
- Success prints the answer. Any failure prints
  `the oracle is offline — try 'help'`.
- Ahnaf shows *thinking* for the duration.

### Server (`api/ask.ts`)

Vercel Node function.

- Accepts only `POST` with JSON `{question: string}`; 400 otherwise.
- Re-validates length (≤300) and type.
- Best-effort per-IP limit: module-level `Map<ip, {windowStart, count}>`,
  20 per hour; returns 429 when exceeded. (Serverless instances are
  ephemeral, so this is a speed bump, not a guarantee.)
- Calls Gemini's REST `generateContent` endpoint with `fetch`. Model:
  the current Flash-Lite model that is free-tier eligible (exact id to be
  confirmed against Google's model list at implementation time, kept in one
  constant). Key from `GEMINI_API_KEY`.
  Missing key → 503.
- System instruction: a fixed string containing the resume text and the
  portfolio content (experience, projects, education, leadership, skills),
  with rules: answer only questions about Ahnaf's work, education, skills,
  and how to contact him; ≤120 words; plain text, no markdown; if asked
  anything else, reply with one sentence saying you can only talk about
  Ahnaf and suggest `help`.
- `maxOutputTokens: 300`. 15 s upstream timeout.
- Response `{answer: string}` or `{error: string}` with a non-200 status.
- The Gemini call lives in one function `callProvider(question)` so a
  different provider is a one-function swap.
- Never logs the question or the key.

### Deployment notes

- `GEMINI_API_KEY` is set in the Vercel project's environment variables.
  Nothing in the repo contains the key.
- Local dev uses `vercel dev` or an `.env.local` that is git-ignored.

## Testing

Add Vitest as a dev dependency with `npm test`.

Unit tests (TDD):

- `commands.ts`: dispatch by name, case-insensitivity, each scripted
  command's output shape, unknown-command suggestion (distance ≤2 suggests,
  otherwise no suggestion).
- `useTerminal.ts` history: ↑/↓ bounds, new entry resets cursor.
- `ask.ts` quota: counts per day, resets on date change, cap at 10.
- `api/ask.ts`: method/validation responses, per-IP limit, provider error
  mapping, with `fetch` mocked.

Browser checks (manual, screenshots): idle card is pixel-identical to the
current one; active state on desktop and 390 px mobile; companions on the
title bar; reduced-motion mode.

## Risks

- Gemini free-tier quota is shared by all visitors. The per-visitor and
  per-IP caps bound it; exhaustion degrades to the offline message, never
  an error on screen.
- Sprite art is hand-drawn pixel data; it will take a few iterations to look
  right. Frames are cheap to change.
