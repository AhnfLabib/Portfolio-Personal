# Artist page redesign

Date: 2026-11-05
Status: reviewed with the user; music and design decisions folded in

## Goal

Make the Artist persona a page that *shows* the work. Today it promises
photography and music and shows gradient placeholders with invented
titles. The redesign puts Ahnaf's real photographs on the page, organised
as rolls, with a real music section, in the visual language his
illustrated headshot already sets: paper, ink, halftone grey, one accent.

Guided by the vendored `taste-skill` (service/studio kind: photographs
lead, flat grounds, no effects, no scroll reveals, no captions explaining
pictures, one section per screen).

## Out of scope

- The Dev persona, the navbar component, the footer, `PersonaToggle`.
- The theme tokens in `index.css` (the paper palette stays).
- Any CMS. Content lives in `content.ts` and `public/gallery/`.

## Page plan (1440×900 screens)

| # | Section | id | Screens | Content |
|---|---|---|---|---|
| 1 | Hero | `top` | 1 | One photograph, full-bleed, filling the first screen. Name and one line in the bottom-left corner. No headline, no marquee, no blobs. |
| 2 | Statement | `statement` | 1 | The illustrated headshot (small, 96 px, no caption) beside two short plain sentences and a *now* line. |
| 3 | Rolls | `rolls` | 2–4 | The gallery. Photographs grouped into rolls; each roll is a titled contact-sheet row. Click opens a lightbox. |
| 4 | Music | `music` | 1–2 | Three cover reels embedded from Instagram, then a drafts player for Ahnaf's own recordings. |
| 5 | Contact | `contact` | 1 | Kept from today, copy trimmed. |

Removed: aurora `CreativeBackground`, `Marquee`, `CreativeCrafts`,
`CreativeQuote`, the fake `GalleryItem` gradients, and every
`whileInView` fade on this page.

## Visual language

- Grounds: `bg` paper only. No gradients, blobs, grain overlays or tints.
- Type: Fraunces for the name and roll titles, Manrope for body, JetBrains
  Mono for frame numbers and metadata. One heading scale: roll title
  2rem, body 1rem/1.6, mono 0.75rem uppercase tracking-wide.
- Accent: the existing burnt orange, used only for links and the active
  lightbox control.
- Photographs: no rounded corners, no borders, no drop shadows. A 1 px
  `line` hairline separates rolls. Hover: image zooms 1.02 inside its
  frame (taste rule 5); nothing tilts.
- Frame numbers: each photograph carries a mono label in its corner on
  hover only, `R2 · 04` (roll · frame). That is the only text on an image.

## Hero

- `public/gallery/hero.jpg` (2000 px wide, ≤400 KB) as an `<img>` with
  `object-fit: cover`, `fetchpriority="high"`, `width`/`height` set.
- Fills `100svh - 4rem` (nav height). The bottom-left block, inside the
  `.wrap` edges: `Ahnaf Labib` (Fraunces, 1.5rem) and the hero line from
  `content.ts` (Manrope, 1rem, `ink` on a dark image means the text sits
  on a 40 % black-to-transparent bottom gradient that is part of the
  image frame, not a page ground).
- One action: `See the rolls ↓` as a mono link, bottom-right.
- Chosen hero: the eclipse at diamond ring (`8.jpg`). It reads at any
  width, it is the most singular frame of the set, and a black field with
  one bright ring on a paper page is the page's one loud gesture.

## Statement

Two columns on md+, stacked on mobile.

- Left: headshot illustration at 96×96, no border, no caption.
- Right: `creative.statement` reduced to two plain sentences (editable in
  `content.ts`; draft: *"I photograph what light does when nobody is
  posing: rooms at the end of the day, stages lit red, a street in fog,
  one eclipse. Between frames I play guitar."*), then a `now` line in
  mono: `now · ` + `creative.now` (e.g. `shooting on 35mm around
  Greencastle · learning slide guitar`).

## Rolls (gallery)

### Data

```ts
export interface Frame {
  src: string;        // "/gallery/r1-01.jpg"
  width: number;      // intrinsic px, for aspect ratio and no layout shift
  height: number;
  alt: string;        // plain description for screen readers, never shown
}
export interface Roll {
  id: string;         // "light"
  title: string;      // "Light"
  frames: Frame[];
}
export const rolls: Roll[] = [...]
```

### Selection and order

From the 17 supplied photographs, 15 are used (the daytime cupola is
dropped for the dusk one; the third eclipse frame — the thin crescent —
is dropped to keep the eclipse pair strong).

| Roll | Title | Frames (supplied file → gallery file) |
|---|---|---|
| R1 | Light | eclipse corona `9.jpg` → `r1-01`, PS5 room at golden hour `5.jpg` → `r1-02`, cupola at dusk `10.jpg` → `r1-03`, living room `6.jpg` → `r1-04`, porch `19.jpg` → `r1-05` |
| R2 | Street | Uttara North platform `7.jpg` → `r2-01`, One Way in fog `18.jpg` → `r2-02`, fisheye mirror `12.jpg` → `r2-03`, 560 SL on the highway `20.jpg` → `r2-04` |
| R3 | Stage | red silhouette `13.jpg` → `r3-01`, band in red `14.jpg` → `r3-02`, blue guitarist `15.jpg` → `r3-03`, sax and lights `16.jpg` → `r3-04` |
| R4 | Portrait | chess sunglasses `11.jpg` → `r4-01` |

Hero: `8.jpg` → `hero.jpg` (not repeated in a roll).

### Layout

- Each roll: a mono eyebrow `R1`, the title in Fraunces, a hairline, then
  its frames in a CSS grid, `grid-auto-flow: dense`, 3 columns at ≥1024,
  2 at ≥640, 1 below. Landscape frames span 1 column; portrait frames
  span 1 column and 2 rows; the first frame of each roll spans 2 columns
  on ≥1024. Gaps 12 px. Equal left and right edges with the `.wrap`.
- Images are `loading="lazy"` except the hero, `decoding="async"`, with
  `width`/`height` attributes so nothing shifts.
- Below the last roll: one line, `More on Instagram → @itsded_inside`,
  as a mono link. No card.

### Lightbox

Hand-written, ~120 lines, no dependency.

- Opens on click or Enter on a frame. Shows the image at `max-height:
  90vh`, paper-dark backdrop (`ink` at 92 %), the frame label `R2 · 03`
  and a close control.
- ← / → move within the roll and across rolls; Esc closes; focus is
  trapped while open and returned to the opening frame on close; `role=
  "dialog"`, `aria-modal`, `aria-label` = the frame's alt.
- Arrow controls are visible buttons at the sides on ≥640; on mobile,
  swipe (pointer events, 40 px threshold) and tap-to-close on the
  backdrop.
- Preloads the next and previous image when opened.
- Body scroll locked while open; `prefers-reduced-motion` → no fade.

## Music

Ahnaf's music lives on Instagram (`@labib.onrecord`). The section has
two parts, both real content.

### Covers

Three Instagram reels, in `content.ts`:

```ts
export interface Cover { title: string; artist: string; reel: string } // reel = Instagram reel id
covers: [
  { title: "Lover, You Should've Come Over", artist: "Jeff Buckley", reel: "DfWL_P3x3Cs" },
  { title: "Tuyo", artist: "Rodrigo Amarante", reel: "Des9G6mOc-7" },
  { title: "Love Ain't Always So Good", artist: "", reel: "DefxSxpNfCp" },
]
```

(Artist names are my best guess from the titles; the user corrects them
in `content.ts`.)

- Rendered as a 3-column row (1 column below 640). Each cover is an
  `<iframe src="https://www.instagram.com/reel/<id>/embed/" loading=
  "lazy" title="<title> — cover by Ahnaf Labib">` at Instagram's
  portrait aspect (9:16 within a max height of 70vh), no border radius,
  no card.
- The iframe is mounted only when the section scrolls near the viewport
  (IntersectionObserver, 400 px margin) so the three Instagram bundles
  don't load with the page.
- Under each iframe one mono line: `<title> · <artist>` as a link to the
  reel. If the iframe fails to load (Instagram blocked, no network) the
  link is what remains, so the section never shows an empty frame.
- Heading `Music`, one plain line: `Covers, recorded in one take, and
  drafts of my own.` A mono link `@labib.onrecord →` to the music page.

### Drafts

Ahnaf's own works in progress, as audio files he supplies.

```ts
export interface Draft { title: string; src: string; month: string; duration: number }
drafts: Draft[]   // src = "/audio/<slug>.mp3", duration in seconds
```

- Files are committed to `public/audio/` as MP3 (128 kbps, mono or
  stereo as supplied). A one-off step in `scripts/prepare-gallery.mjs`
  (extended to `prepare-media.mjs`) transcodes with `ffmpeg` if needed
  and prints each draft's duration for `content.ts`.
- A hand-written player, no dependency: a list of rows, each `title ·
  month` in Fraunces/mono, a play/pause button, a progress bar that is
  a real `<input type="range">` for keyboard scrubbing, and elapsed /
  total in mono. One `<audio>` element per row, `preload="metadata"`.
  Playing one row pauses the others. Space toggles the focused row.
- The sub-heading reads `Drafts` with one mono line: `unfinished, on
  purpose`.
- If `drafts` is empty the sub-section is not rendered at all.

### Stage roll

R3 (Stage) stays in Rolls; it is not moved here, since Music now has
its own real content.

## Contact

Kept. Changes: the headline becomes `Say hello.`; the paragraph is cut to
one sentence; the `for work inquiries → the dev side` switch stays.

## Navigation

`navCreative` becomes `Statement`, `Rolls`, `Music`, `Contact`.

## Image pipeline

A one-off script, `scripts/prepare-gallery.mjs` (Node + `sharp`, dev
dependency), takes the originals from a local folder and writes
`public/gallery/*.jpg` at 1600 px on the long edge, quality 80,
progressive, EXIF stripped, plus `*-800.jpg` for the grid, and prints
the `Frame` objects with real dimensions for `content.ts`. Originals are
not committed. Budget: hero ≤400 KB, grid images ≤120 KB each.

`<img srcset>` with the 800 and 1600 variants and `sizes` matching the
grid columns.

## Files

```
src/components/creative/
  CreativePortfolio.tsx   section order
  CreativeHero.tsx        rewritten
  CreativeStatement.tsx   rewritten
  CreativeRolls.tsx       new: rolls grid + frame labels
  Lightbox.tsx            new
  CreativeMusic.tsx       new: covers row + drafts list
  DraftPlayer.tsx         new: one audio row
  CreativeContact.tsx     trimmed copy
  (deleted) CreativeBackground.tsx, Marquee.tsx, CreativeCrafts.tsx,
            CreativeQuote.tsx, CreativeGallery.tsx
src/data/content.ts       Frame/Roll types, rolls, hero line, now line,
                          music embeds; GalleryItem/Craft types removed
scripts/prepare-gallery.mjs
public/gallery/           hero.jpg, r1-01.jpg … and -800 variants
```

`Section.tsx` keeps its creative branch for now (unused by this page
after the redesign); it is not modified.

## Accessibility

- Every image has a plain `alt`. Hover labels are `aria-hidden`.
- Lightbox per the spec above. All controls reachable by keyboard.
- Contrast: hero text sits on the gradient so it meets 4.5:1 on the
  eclipse image.
- `prefers-reduced-motion`: no zoom on hover, no lightbox fade.

## Testing

- Unit (Vitest): roll/frame layout helper (which frame spans what),
  lightbox index navigation across rolls (pure function), the draft
  player's "one playing at a time" reducer, time formatting,
  `prepare-media` output shape.
- Browser: screenshots at 1440, 1024, 768, 390 for every section; the
  taste-skill checker (`consistency.mjs`, `check.mjs`, `perf.mjs`) run
  against the built page with `--page service`, findings fixed or listed
  with reasons; Lighthouse performance on the Artist page ≥ 90 on mobile.

## Open items

- Draft audio files. Until supplied, the Drafts sub-section is not
  rendered.
- Design work is not a section: Ahnaf's design work is his web projects,
  which the Dev persona already shows.

## Revision v2: dark editorial (user decision, 2026-11-06)

The owner reviewed the built page and chose a new direction from two
mock-ups (same layout, paper vs dark): **dark**. This section supersedes
the Page plan, Visual language, Hero, Statement, Rolls layout, Music and
Contact sections above where they differ. The mock-up source is
`scratchpad/mockups/mock-dark.html` (session only); its structure is the
reference.

### Palette (Artist persona tokens)
`bg #0e0d0b`, `surface #161412`, `surface-2 #1f1c19`, `line #2a2622`,
`ink #f3eee4`, `ink-soft #c9c1b3`, `ink-faint #8e8477` (≥4.5:1 on bg),
`accent #e0522f` (≥4.5:1 on bg; accent-ink `#0e0d0b` on it ≥4.5:1),
`accent-soft #f0663c`. The persona toggle and nav use the same tokens.
Location everywhere: Indianapolis, IN (not Greencastle).

### Hero — photo wall (one screen)
An asymmetric grid filling `100svh − 4rem`: one large frame (≈50 % width,
full height), a tall portrait, two landscapes and one portrait on the
right, 12 px gaps. Frames: **to be chosen once the owner's new portrait
photographs arrive** (hero candidates so far: red stage silhouette,
fisheye B&W, blue 560 SL, chess-sunglasses portrait, cupola at dusk).
The name `Ahnaf Labib` in Fraunces ~7rem, tracking −0.03em, on a frosted
dark strip overlapping the top-left of the large frame; under it one mono
line `Indianapolis, IN · 35mm & digital · 2024–26`; bottom-right mono link
`See the rolls ↓`. Entrance: frames fade/settle once on load (600 ms,
staggered 60 ms), none under reduced motion; no scroll effects. On phones
the name sits above a 2-column wall.

### Statement
Two columns: the illustration as a 120 px sticker rotated −4° with a 1 px
`line` border and soft shadow; the sentence as a Fraunces italic
pull-quote at 2.75rem; below, three mono pills `35mm` `Indianapolis`
`slide guitar` (from `creative.tags`). Statement text unchanged.

### Rolls
Section heading `Rolls` with `4 rolls · 15 frames` mono. Each roll: a
two-column layout — left column `sticky top-24` with `R1` mono, title in
Fraunces 2rem, `5 frames` mono, a thin rule; right column the CSS-columns
contact sheet (as built). Frames with a baked-in white film border
(`r1-02`, `r1-04`) are cropped to the image by `prepare-media` (auto-detect
the near-white border, inset 2 px).

### Music
Covers in a horizontal snap-scroll strip (`scroll-snap-type: x mandatory`),
each a 9:16 card with the Instagram embed (lazy, as built) and the mono
title line beneath; the drafts player becomes a "deck" card
(`surface-2`, 1 px `line`, 16 px radius is NOT used — square) with the
three rows as built.

### Contact
`Say hello.` in Fraunces 5rem; one row of mono links `email · instagram ·
linkedin · github` (no button); then the tiny `for work inquiries → the
dev side ↗` switch. Footer unchanged.

### Everything else
Lightbox, drafts player behaviour, accessibility, reduced motion, tests
and the verification pass stay as specified. Lighthouse target stays 90.
