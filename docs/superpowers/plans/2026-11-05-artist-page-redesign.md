# Artist Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Artist persona page around Ahnaf's real photographs (as rolls with a lightbox), his Instagram cover reels, and a drafts audio player, in the paper/ink language of his illustrated headshot.

**Architecture:** Content is data in `content.ts` (`rolls`, `covers`, `drafts`, copy lines) generated once by `scripts/prepare-media.mjs` from the supplied originals. Five presentational components (`CreativeHero`, `CreativeStatement`, `CreativeRolls` + `Lightbox`, `CreativeMusic` + `DraftPlayer`, trimmed `CreativeContact`) replace the current six. Pure helpers (grid spans, lightbox navigation, player reducer, time formatting) are unit-tested; the page is verified in a browser at four widths.

**Tech Stack:** React 19, TypeScript, Tailwind v4, Vitest + Testing Library (from the terminal plan's Task 1), `sharp` (dev) and system `ffmpeg` for the one-off media script.

**Spec:** `docs/superpowers/specs/2026-11-05-artist-page-redesign.md`

## Global Constraints

- Grounds are `bg` paper only: no gradients, blobs, grain, tints. No `whileInView`/scroll reveals anywhere on this page. No marquee.
- Photographs: no rounded corners, borders or shadows; hover zoom 1.02 inside the frame; nothing tilts. The only text on an image is the hover frame label `R2 · 03` (`aria-hidden`).
- No captions under images. Every `<img>` has a plain `alt`, `width`, `height`; all but the hero are `loading="lazy" decoding="async"`.
- One heading scale: roll title 2rem Fraunces; body 1rem/1.6 Manrope; mono 0.75rem uppercase tracking-wide JetBrains Mono. Accent only on links and the active lightbox control.
- Equal left/right content edges: every section's content sits inside `mx-auto max-w-6xl px-4 sm:px-6`.
- Hero: `public/gallery/hero.jpg`, 2000 px wide, ≤400 KB, `fetchpriority="high"`, fills `calc(100svh - 4rem)`. Grid images ≤120 KB (800 px) with 1600 px variants in `srcset`.
- Lightbox: ← → Esc; focus trapped and returned; `role="dialog" aria-modal="true"`; body scroll locked; swipe threshold 40 px; preloads prev/next.
- Drafts player: one `<audio preload="metadata">` per row; playing one pauses the others; range input for scrubbing; Space toggles the focused row.
- Covers: `https://www.instagram.com/reel/<id>/embed/` iframes mounted only within 400 px of the viewport; a link line under each is always rendered.
- Copy comes from `content.ts`; exact strings in the spec are used verbatim.
- `prefers-reduced-motion`: no hover zoom, no lightbox fade.
- Commit after every task with the session's attribution lines.

## Review Focus

1. A gallery image 404s (file renamed): the frame must show its `alt` text at the correct aspect ratio, not collapse the grid. Test in Task 4 (frame renders with explicit `aspect-ratio` from `width/height`, independent of image load).
2. Instagram blocked (ad-blocker, offline): the cover's title/artist link must be visible without the iframe. Test in Task 6 (link rendered outside and regardless of iframe mount).
3. Lightbox opened by keyboard from the last frame of the last roll, then → pressed: must stay on the last frame (no wrap to undefined). Test in Task 5 (`nextIndex` clamps).
4. Two drafts: pressing play on the second while the first plays must pause the first within the same tick and never leave both `playing`. Test in Task 6 (reducer).
5. At 390 px a portrait frame must not span two rows in a one-column grid (it would leave a hole). Test in Task 4 (`spanFor` returns `{col:1,row:1}` for `columns === 1`).

---

### Task 1: Media preparation script and assets

**Files:**
- Create: `scripts/prepare-media.mjs`
- Create: `public/gallery/hero.jpg`, `public/gallery/r1-01.jpg` … `r4-01.jpg` and `*-800.jpg` variants; `public/audio/fog.mp3`, `public/audio/untitled-1.mp3`, `public/audio/dragonfly.mp3`
- Create: `scripts/media-manifest.json` (script output: frames and drafts with dimensions/durations)
- Test: `scripts/prepare-media.test.mjs` (node environment)

**Interfaces:**
- Produces: `node scripts/prepare-media.mjs --photos <dir> --audio <dir> --out public` writes the files above and `scripts/media-manifest.json` shaped `{ hero: Frame, rolls: Roll[], drafts: Draft[] }` where `Frame = { src, width, height, alt }`, `Roll = { id, title, frames }`, `Draft = { title, src, month, duration }`.
- Exports (for the test): `export const PHOTO_MAP`, `export function slugify(name: string): string`, `export function buildManifest(entries): Manifest`.

- [ ] **Step 1: Install `sharp`**

Run: `npm i -D sharp@^0.35`

- [ ] **Step 2: Write the failing test**

```js
// scripts/prepare-media.test.mjs   (// @vitest-environment node)
import { PHOTO_MAP, slugify, buildManifest } from "./prepare-media.mjs";
it("maps the 16 supplied photographs to hero + 15 roll frames", () => {
  expect(PHOTO_MAP.hero).toBe("8.jpg");
  expect(Object.values(PHOTO_MAP.rolls).flat()).toHaveLength(15);
  expect(PHOTO_MAP.rolls.light).toEqual(["9.jpg", "5.jpg", "10.jpg", "6.jpg", "19.jpg"]);
  expect(PHOTO_MAP.rolls.street).toEqual(["7.jpg", "18.jpg", "12.jpg", "20.jpg"]);
  expect(PHOTO_MAP.rolls.stage).toEqual(["13.jpg", "14.jpg", "15.jpg", "16.jpg"]);
  expect(PHOTO_MAP.rolls.portrait).toEqual(["11.jpg"]);
});
it("slugify", () => { expect(slugify("Untitled_1.qta")).toBe("untitled-1"); expect(slugify("Fog.m4a")).toBe("fog"); });
it("buildManifest names files r<roll>-<nn> and keeps dimensions", () => {
  const m = buildManifest({ hero: { width: 2000, height: 1125 }, rolls: { light: [{ width: 2000, height: 1125 }] , street: [], stage: [], portrait: [] }, drafts: [{ title: "Fog", slug: "fog", duration: 43.9 }] });
  expect(m.rolls[0]).toMatchObject({ id: "light", title: "Light" });
  expect(m.rolls[0].frames[0]).toMatchObject({ src: "/gallery/r1-01.jpg", width: 2000, height: 1125 });
  expect(m.drafts[0]).toEqual({ title: "Fog", src: "/audio/fog.mp3", month: "", duration: 44 });
});
```

- [ ] **Step 3: Run to verify it fails** → `npx vitest run scripts` → FAIL.

- [ ] **Step 4: Implement the script**

`PHOTO_MAP` from the spec's selection table (source files live in the folder passed by `--photos`; the supplied numbering `5.jpg … 21.jpg` is the key). Images: `sharp(src).rotate().resize({ width: 1600, withoutEnlargement: true }).jpeg({ quality: 80, progressive: true, mozjpeg: true })` → `r<n>-<nn>.jpg`; same at 800 → `-800.jpg`; hero at 2000 → `hero.jpg`. If a hero exceeds 400 KB or a grid image 120 KB, lower quality in steps of 5 until it fits (min 60) and print the final quality. `alt` strings: a fixed table in the script, one plain sentence per frame (e.g. `"A total solar eclipse at the diamond-ring moment"`). Audio: `ffmpeg -y -i <src> -map 0:a:0 -ac 2 -ar 44100 -b:a 128k public/audio/<slug>.mp3` via `child_process.execFileSync`; duration via `ffprobe -show_entries format=duration`. Drafts' `month` is `""` (unknown; user fills in). Script only runs the pipeline under `if (process.argv[1] === fileURLToPath(import.meta.url))` so the test can import it.

- [ ] **Step 5: Run the script on the supplied originals**

Photos are at `/tmp/claude-0/-home-user-portfolio-personal/0ed17ada-4bfe-520e-948e-2e80d823e9d2/scratchpad/photos`, audio at `/tmp/claude-0/-home-user-portfolio-personal/0ed17ada-4bfe-520e-948e-2e80d823e9d2/scratchpad/audio` (the three `.m4a`/`.qta` originals). Run: `node scripts/prepare-media.mjs --photos <photos> --audio <audio> --out public`. Expected: 1 + 15×2 jpgs and 3 mp3s; `du -sh public/gallery` ≈ 3–5 MB; every size within budget.

- [ ] **Step 6: Run tests** → PASS. Commit:

```bash
git add scripts package.json package-lock.json public/gallery public/audio
git commit -m "feat(artist): media pipeline and prepared gallery/audio assets"
```

---

### Task 2: Content model

**Files:**
- Modify: `src/data/content.ts` (replace the creative block at the end: `creativeHero`, `CraftIcon`, `Craft`, `GalleryItem`, `creative`, `quote`; update `navCreative`)
- Test: `src/data/content.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface Frame { src: string; width: number; height: number; alt: string }
  export interface Roll { id: string; title: string; frames: Frame[] }
  export interface Cover { title: string; artist: string; reel: string }
  export interface Draft { title: string; src: string; month: string; duration: number }
  export const navCreative: NavItem[];   // Statement #statement, Rolls #rolls, Music #music, Contact #contact
  export const creative: {
    hero: { image: Frame; line: string; cta: string };           // line: "Photographs and music. Greencastle, Indiana · Dhaka."; cta: "See the rolls"
    statement: string;                                            // spec draft sentence, verbatim
    now: string;                                                  // "shooting on 35mm around Greencastle · learning slide guitar"
    rolls: Roll[];                                                // from scripts/media-manifest.json, pasted as literals
    music: { handle: string; url: string; line: string; covers: Cover[]; drafts: Draft[]; draftsLine: string };
    contact: { headline: string; line: string };                  // "Say hello." / one sentence
  };
  ```
- `about.artistImage`, `about.instagram`, `socials` unchanged. `quote` removed (its only consumer is deleted in Task 7).

- [ ] **Step 1: Write the failing tests**

```ts
import { existsSync } from "node:fs";
it("every frame file exists with its 800 variant and positive dimensions", () => {
  for (const r of creative.rolls) for (const f of r.frames) {
    expect(existsSync(`public${f.src}`)).toBe(true);
    expect(existsSync(`public${f.src.replace(/\.jpg$/, "-800.jpg")}`)).toBe(true);
    expect(f.width).toBeGreaterThan(0); expect(f.alt.length).toBeGreaterThan(10);
  }
  expect(existsSync(`public${creative.hero.image.src}`)).toBe(true);
});
it("rolls are R1..R4 in spec order with the spec's frame counts", () => {
  expect(creative.rolls.map(r => [r.id, r.frames.length])).toEqual([["light", 5], ["street", 4], ["stage", 4], ["portrait", 1]]);
});
it("covers carry reel ids, drafts carry existing files", () => {
  expect(creative.music.covers.map(c => c.reel)).toEqual(["DfWL_P3x3Cs", "Des9G6mOc-7", "DefxSxpNfCp"]);
  for (const d of creative.music.drafts) expect(existsSync(`public${d.src}`)).toBe(true);
});
it("navCreative is Statement, Rolls, Music, Contact", () => {});
```

- [ ] **Step 2: Run to verify it fails** → FAIL (old shape).

- [ ] **Step 3: Implement** — paste the manifest into `content.ts` as literals (no runtime JSON import), set copy per spec, `music.handle = "@labib.onrecord"`, `music.url = "https://www.instagram.com/labib.onrecord/"`, `music.line = "Covers, recorded in one take, and drafts of my own."`, `draftsLine = "unfinished, on purpose"`, covers with artists `Jeff Buckley`, `Rodrigo Amarante`, `""`.

- [ ] **Step 4: Typecheck** — `npx tsc -b` will fail on the old creative components; that is expected until Task 7. Run only `npx vitest run src/data` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/content.ts src/data/content.test.ts
git commit -m "feat(artist): content model for rolls, covers and drafts"
```

---

### Task 3: Hero and Statement

**Files:**
- Rewrite: `src/components/creative/CreativeHero.tsx`, `src/components/creative/CreativeStatement.tsx`
- Test: `src/components/creative/CreativeHero.test.tsx`, `CreativeStatement.test.tsx`

**Interfaces:** both are default-export components with no props, reading `creative` and `about` from `content.ts`.

- [ ] **Step 1: Write the failing tests**

```tsx
it("hero renders the hero image with priority and the name + line + cta", () => {
  render(<CreativeHero />);
  const img = screen.getByRole("img", { name: creative.hero.image.alt });
  expect(img).toHaveAttribute("fetchpriority", "high"); expect(img).toHaveAttribute("width"); 
  expect(screen.getByText("Ahnaf Labib")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /See the rolls/ })).toHaveAttribute("href", "#rolls");
});
it("hero has no marquee, no decorative blobs", () => { expect(document.querySelector("[data-marquee]")).toBeNull(); });
it("statement shows the headshot without a caption and the now line", () => {
  render(<CreativeStatement />);
  expect(screen.getByRole("img", { name: "Ahnaf Labib" })).toHaveAttribute("src", about.artistImage);
  expect(screen.queryByText(/the maker/i)).toBeNull();
  expect(screen.getByText(new RegExp(creative.now))).toBeInTheDocument();
});
```

- [ ] **Step 2: Run to verify it fails** → FAIL.

- [ ] **Step 3: Implement**

Hero: `<section id="top" className="relative h-[calc(100svh-4rem)] overflow-hidden">` with the `<img className="h-full w-full object-cover">`, a bottom gradient `div` (`from-black/60 to-transparent`, bottom 40 %) that belongs to the image frame, and a `.wrap` (`absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-4 sm:px-6 pb-8 flex items-end justify-between`) holding name (Fraunces `text-2xl text-white`) + line (`text-white/90`) left and the mono cta link right. Statement: `grid gap-8 md:grid-cols-[6rem_1fr]`, 96 px `<img>`, statement paragraph `text-lg leading-relaxed`, now line in mono `text-ink-faint`. No framer-motion imports in either file.

- [ ] **Step 4: Run tests** → PASS. Commit:

```bash
git add src/components/creative/CreativeHero.tsx src/components/creative/CreativeStatement.tsx src/components/creative/*.test.tsx
git commit -m "feat(artist): photograph hero and plain statement"
```

---

### Task 4: Rolls grid

**Files:**
- Create: `src/components/creative/CreativeRolls.tsx`, `src/components/creative/rollLayout.ts`
- Test: `src/components/creative/rollLayout.test.ts`, `CreativeRolls.test.tsx`

**Interfaces:**
- `rollLayout.ts`: `export function columnsFor(width: number): 1 | 2 | 3` (≥1024 → 3, ≥640 → 2, else 1); `export function spanFor(frame: Frame, index: number, columns: 1|2|3): { col: 1 | 2; row: 1 | 2 }` (portrait = `height > width` → `row: 2` when `columns > 1`; `index === 0 && columns === 3` → `col: 2`; `columns === 1` → `{1,1}`); `export function frameLabel(rollIndex: number, frameIndex: number): string` → `R2 · 03`.
- `CreativeRolls.tsx`: `export default function CreativeRolls(props: { onOpen: (rollIndex: number, frameIndex: number) => void }): JSX.Element` — section `id="rolls"`, one `<article>` per roll with `R<n>` eyebrow, title, hairline, grid; each frame a `<button type="button">` wrapping the `<img srcset="<src-800> 800w, <src> 1600w" sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw">` with `style={{ aspectRatio: `${width}/${height}` }}` and the hover label. After the last roll, the Instagram mono link.

- [ ] **Step 1: Write the failing tests**

```ts
it("columnsFor", () => { expect(columnsFor(390)).toBe(1); expect(columnsFor(640)).toBe(2); expect(columnsFor(1024)).toBe(3); });
it("spanFor: portrait spans 2 rows except in one column; first frame spans 2 cols at 3 columns", () => {
  const p = { width: 1500, height: 2000 } as Frame, l = { width: 2000, height: 1125 } as Frame;
  expect(spanFor(p, 1, 3)).toEqual({ col: 1, row: 2 }); expect(spanFor(p, 1, 1)).toEqual({ col: 1, row: 1 });
  expect(spanFor(l, 0, 3)).toEqual({ col: 2, row: 1 }); expect(spanFor(l, 0, 2)).toEqual({ col: 1, row: 1 });
});
it("frameLabel pads", () => { expect(frameLabel(1, 2)).toBe("R2 · 03"); });
// CreativeRolls.test.tsx
it("renders every frame as a button with alt, width/height, aspect-ratio, lazy", () => { /* count buttons === total frames; each img has width, height, loading=lazy, style aspect-ratio */ });
it("clicking a frame calls onOpen with roll and frame index", async () => {});
it("the hover label is aria-hidden and there is no figcaption", () => {});
```

- [ ] **Step 2: Run to verify it fails** → FAIL.

- [ ] **Step 3: Implement** — `columnsFor` is used via a `useColumns()` hook (`matchMedia` listeners for 640/1024). Grid: `grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 [grid-auto-flow:dense]`; spans via `style={{ gridColumn: `span ${col}`, gridRow: `span ${row}` }}`. Hover zoom: `group` + `group-hover:scale-[1.02] motion-reduce:group-hover:scale-100 transition-transform duration-500`. Images `object-cover h-full w-full`.

- [ ] **Step 4: Run tests** → PASS. Commit:

```bash
git add src/components/creative/CreativeRolls.tsx src/components/creative/rollLayout.ts src/components/creative/*.test.ts*
git commit -m "feat(artist): rolls contact-sheet grid"
```

---

### Task 5: Lightbox

**Files:**
- Create: `src/components/creative/Lightbox.tsx`, `src/components/creative/lightboxNav.ts`
- Test: `src/components/creative/lightboxNav.test.ts`, `Lightbox.test.tsx`

**Interfaces:**
- `lightboxNav.ts`: `export interface Pos { roll: number; frame: number }`; `export function nextIndex(rolls: Roll[], pos: Pos, dir: 1 | -1): Pos` — moves within the roll, crosses into the next/previous roll at its ends, clamps at the very first/last frame; `export function flatNeighbours(rolls, pos): { prev?: Frame; next?: Frame }`.
- `Lightbox.tsx`: `export default function Lightbox(props: { rolls: Roll[]; pos: Pos | null; onClose: () => void; onNavigate: (pos: Pos) => void; returnFocusTo: HTMLElement | null }): JSX.Element | null`.

- [ ] **Step 1: Write the failing tests**

```ts
it("nextIndex crosses rolls and clamps", () => {
  const rolls = creative.rolls;
  expect(nextIndex(rolls, { roll: 0, frame: 4 }, 1)).toEqual({ roll: 1, frame: 0 });
  expect(nextIndex(rolls, { roll: 1, frame: 0 }, -1)).toEqual({ roll: 0, frame: 4 });
  expect(nextIndex(rolls, { roll: 3, frame: 0 }, 1)).toEqual({ roll: 3, frame: 0 });
  expect(nextIndex(rolls, { roll: 0, frame: 0 }, -1)).toEqual({ roll: 0, frame: 0 });
});
// Lightbox.test.tsx
it("renders nothing when pos is null", () => {});
it("is a modal dialog labelled by the frame alt, with the label R1 · 01", () => {});
it("ArrowRight calls onNavigate with nextIndex; Escape calls onClose; focus returns to returnFocusTo", async () => {});
it("locks body scroll while open and restores on close", () => { /* document.body.style.overflow */ });
it("preloads prev and next (link rel=preload or new Image()) — assert via a spy on global Image", () => {});
```

- [ ] **Step 2: Run to verify it fails** → FAIL.

- [ ] **Step 3: Implement** — portal to `document.body`; backdrop `fixed inset-0 bg-ink/92 z-50`; image `max-h-[90vh] max-w-[92vw] object-contain`; prev/next `<button>`s `hidden sm:flex` with `aria-label`; close button; label mono top-left; keydown handler on the dialog; focus trap by cycling Tab among the three buttons; swipe via pointerdown/up delta ≥40 px; tap on backdrop closes. Fade `motion-reduce:transition-none`.

- [ ] **Step 4: Run tests** → PASS. Commit:

```bash
git add src/components/creative/Lightbox.tsx src/components/creative/lightboxNav.ts src/components/creative/*.test.ts*
git commit -m "feat(artist): accessible lightbox"
```

---

### Task 6: Music — covers and drafts player

**Files:**
- Create: `src/components/creative/CreativeMusic.tsx`, `src/components/creative/DraftPlayer.tsx`, `src/components/creative/player.ts`
- Test: `src/components/creative/player.test.ts`, `CreativeMusic.test.tsx`, `DraftPlayer.test.tsx`

**Interfaces:**
- `player.ts`: `export type PlayerState = { playing: number | null }`; `export type PlayerAction = { type: "play"; index: number } | { type: "pause" } | { type: "ended" }`; `export function playerReducer(s: PlayerState, a: PlayerAction): PlayerState`; `export function formatTime(seconds: number): string` → `0:44`, `1:05`.
- `DraftPlayer.tsx`: `export default function DraftPlayer(props: { draft: Draft; index: number; playing: boolean; onPlay: (index: number) => void; onPause: () => void; onEnded: () => void }): JSX.Element` — one row: title (Fraunces) + month (mono, omitted when `""`), play/pause `<button aria-pressed>`, `<input type="range" aria-label="Seek <title>">`, elapsed / total mono. The `<audio>` is controlled: `playing` true → `.play()`, false → `.pause()`; `timeupdate` drives the range; `onended` → `onEnded`.
- `CreativeMusic.tsx`: default export, no props; section `id="music"`; heading, line, handle link; covers grid (`IntersectionObserver` with `rootMargin: "400px"` gates `<iframe>` mounting; the `<a>` line below is always rendered); `Drafts` sub-section only when `drafts.length > 0`, with `useReducer(playerReducer, { playing: null })`.

- [ ] **Step 1: Write the failing tests**

```ts
it("playerReducer: play switches, pause/ended clear", () => {
  expect(playerReducer({ playing: 0 }, { type: "play", index: 1 })).toEqual({ playing: 1 });
  expect(playerReducer({ playing: 1 }, { type: "pause" })).toEqual({ playing: null });
  expect(playerReducer({ playing: 1 }, { type: "ended" })).toEqual({ playing: null });
});
it("formatTime", () => { expect(formatTime(44)).toBe("0:44"); expect(formatTime(65.4)).toBe("1:05"); expect(formatTime(0)).toBe("0:00"); });
// CreativeMusic.test.tsx (stub IntersectionObserver)
it("renders a link line per cover regardless of iframe", () => { /* 3 links with href containing the reel id; 0 iframes before intersection */ });
it("mounts iframes once intersecting", () => { /* trigger the observer callback → 3 iframes with src .../embed/ and a title */ });
it("renders drafts rows; playing one pauses the other", async () => { /* mock HTMLMediaElement.prototype.play/pause; click play on row 2 then row 1 → row 2 button aria-pressed=false */ });
it("omits the Drafts sub-section when drafts is empty", () => { /* vi.mock content with drafts: [] */ });
// DraftPlayer.test.tsx
it("Space on the focused row toggles play", async () => {});
it("range input seeks the audio", async () => { /* set currentTime via change event */ });
```

- [ ] **Step 2: Run to verify it fails** → FAIL.

- [ ] **Step 3: Implement** per the interfaces. jsdom has no media playback: mock `play`/`pause` in tests (`vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue()`).

- [ ] **Step 4: Run tests** → PASS. Commit:

```bash
git add src/components/creative/CreativeMusic.tsx src/components/creative/DraftPlayer.tsx src/components/creative/player.ts src/components/creative/*.test.ts*
git commit -m "feat(artist): instagram covers and drafts player"
```

---

### Task 7: Assemble the page, trim contact, delete the old components

**Files:**
- Modify: `src/components/creative/CreativePortfolio.tsx` (order: Hero, Statement, Rolls + Lightbox state, Music, Contact), `src/components/creative/CreativeContact.tsx` (headline/line from `creative.contact`; remove `whileInView`), `src/components/Navbar.tsx` only if it hard-codes creative labels (check; `navCreative` is data)
- Delete: `CreativeBackground.tsx`, `Marquee.tsx`, `CreativeCrafts.tsx`, `CreativeQuote.tsx`, `CreativeGallery.tsx`, `SegmentedText.tsx` (if no remaining importer — grep first)
- Test: `src/components/creative/CreativePortfolio.test.tsx`

**Interfaces:** `CreativePortfolio` holds `const [pos, setPos] = useState<Pos | null>(null)` and `returnFocusTo` ref; passes `onOpen` to `CreativeRolls` and `pos/onClose/onNavigate` to `Lightbox`.

- [ ] **Step 1: Write the failing test**

```tsx
it("renders the five sections in order and opens the lightbox from a frame", async () => {
  render(<PersonaProvider><CreativePortfolio /></PersonaProvider>);
  const ids = [...document.querySelectorAll("main section")].map(s => s.id);
  expect(ids).toEqual(["top", "statement", "rolls", "music", "contact"]);
  await user.click(screen.getAllByRole("button", { name: creative.rolls[0].frames[0].alt })[0]);
  expect(screen.getByRole("dialog")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run to verify it fails** → FAIL.

- [ ] **Step 3: Implement**; then `grep -rn "SegmentedText\|Marquee\|CreativeBackground\|creativeHero\|quote" src` must return nothing outside deleted files; delete them.

- [ ] **Step 4: Full suite, typecheck and build** → `npm test` PASS; `npm run build` succeeds (this is the first point the whole page compiles).

- [ ] **Step 5: Commit**

```bash
git add -A src/components/creative src/components/Navbar.tsx
git commit -m "feat(artist): assemble redesigned page and remove old sections"
```

---

### Task 8: Browser verification and taste check

**Files:**
- Create: `docs/superpowers/reports/2026-11-05-artist-verification.md`

- [ ] **Step 1: Screenshots** — `npx vite preview --port 4173`; Playwright with `localStorage.portfolio-persona = "creative"`; full-page screenshots at 1440×900, 1024×768, 768×1024, 390×844 into the plan workspace; then per-section checks: hero fills the first screen alone (no second section visible at 1440×900); every roll's frames render (no empty tiles, `naturalWidth > 0` for every img after scroll); lightbox opens, ← → Esc work, focus returns; covers mount iframes after scroll; drafts play button toggles (`audio.paused` flips) and only one row is `aria-pressed=true` at a time; 390: one column, no horizontal scroll (`document.documentElement.scrollWidth === 390`).

- [ ] **Step 2: Reduced motion** — `emulateMedia({ reducedMotion: "reduce" })`: hover on a frame produces no transform change.

- [ ] **Step 3: taste-skill checker** — from `.claude/skills/taste-skill`: `node scripts/consistency.mjs dist/index.html --root dist --widths 1440,1024,820,768,390 --page service --category "photographs and music" --primary "See the rolls"` and `node assets/layout/check.mjs --url dist/index.html --sizes 1440x900,1024x768,768x1024,390x844` (the page must be rendered with the creative persona: if the checker cannot set `localStorage`, build a temporary `index.html` copy that sets `data-persona="creative"` on `<html>` and the storage key in an inline script). Record every FAIL with either the fix made or the reason it is judged a false positive (e.g. checks that assume a company landing page).

- [ ] **Step 4: Lighthouse (best effort)** — `npx lighthouse http://localhost:4173/ --preset=mobile --chrome-flags="--headless --no-sandbox" --chrome-path=/opt/pw-browsers/chromium --only-categories=performance --output=json`; record the score; if `< 90`, note the top opportunities for a follow-up (do not optimise further in this task).

- [ ] **Step 5: Write the report and commit**

```bash
git add docs/superpowers/reports
git commit -m "docs(artist): browser and taste verification report"
```

---

### Task 9: Verification fixes (from the Task 8 report)

**Files:**
- Modify: `src/index.css` (creative persona tokens only), `index.html` (fonts loading, hero preload), `src/App.tsx` (lazy personas), `src/components/creative/CreativeHero.tsx`, `CreativeMusic.tsx`, `CreativeContact.tsx`, `DraftPlayer.tsx`
- Test: existing suites; add `src/App.test.tsx` for the lazy split

- [ ] **Step 1: Contrast.** In `index.css` under `html[data-persona="creative"]`: `--color-ink-faint` → a value giving ≥ 4.5:1 on `#f6f1e7` (e.g. `#6b6253`); `--color-accent` → ≥ 4.5:1 for white text on it and for it as small text on paper (e.g. `#b9371a`), `--color-accent-soft` one step lighter (`#d04a2a`). Verify with a contrast calculation in a test (`src/theme.test.ts`: parse the two values from `index.css` and assert ratios).
- [ ] **Step 2: Alignment.** Hero bottom block uses the same `.wrap` padding as other sections (remove any extra inset); cover frames left-aligned under their link lines (`mx-auto` → none; keep the width cap); contact eyebrow centred (rule on both sides or no rule).
- [ ] **Step 3: Fonts.** Make the Google Fonts stylesheet non-render-blocking in `index.html` (`media="print" onload="this.media='all'"` + `<noscript>` fallback) and keep `display=swap`.
- [ ] **Step 4: Code split.** `App.tsx`: `const DevPortfolio = lazy(() => import(...))`, same for `CreativePortfolio`, inside `<Suspense fallback={null}>`. Test: rendering the shell with persona creative does not import the Dev chunk (spy on the dynamic import via `vi.mock` of the Dev module throwing if imported).
- [ ] **Step 5: Hero discovery.** `index.html`: `<link rel="preload" as="image" href="/gallery/hero.jpg" fetchpriority="high">` (20 KB; acceptable on the Dev persona too).
- [ ] **Step 6: Audio.** `DraftPlayer`: `preload="none"` (duration comes from `content.ts`).
- [ ] **Step 7: Re-verify.** Re-run the Task 8 checks 7–9 (a11y pass, consistency.mjs contrast/alignment rows, Lighthouse ×3) and append results to the verification report. Commit.
