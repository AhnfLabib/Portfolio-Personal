# Artist page: browser verification and taste check

Date: 2026-11-05. Branch `artist-redesign` at `3e3b033`. Task 8 of the Artist page redesign plan.

Setup: `npm run build`, then `npx vite preview --port 4174`. Playwright (Chromium 1243) with
`localStorage["portfolio-persona"] = "creative"` and `sessionStorage["intro-played"] = "1"` set by
`addInitScript`. The intro loader is skipped this way so it does not cover the page. Every page loaded with
`html[data-persona="creative"]`. The browser checks raised no page errors.

The screenshots and raw outputs are in `.superpowers/sdd/2026-11-05-artist-page-redesign/`. That folder is
git-ignored, so its files are not committed. All paths below are relative to it. The Playwright script
is `task8-verify.cjs` and its raw results are in `taste-shots/verify.json`.

## Summary

| # | Check | Result | Key number |
|---|---|---|---|
| 1 | Hero alone on the first screen (1440×900) | PASS | `#statement` top = 900; hero height 836 (= 900 − 64) |
| 2 | Every roll image renders | PASS | 14/14 loaded at each of 4 widths; 0 `figcaption` |
| 3 | Lightbox: keys, focus return, swipe | PASS | ArrowRight → `R1 · 02`; Esc returns focus to the first frame; swipe → `R1 · 02` |
| 4 | Drafts: one playing at a time | PASS | `paused` false after play; never more than one `aria-pressed="true"`; 0 `play()` rejections |
| 5 | 390: one column, no horizontal scroll | PASS | 14 frames at x = 16; `scrollWidth` 390 |
| 6 | Reduced motion: no zoom on hover | PASS | `scale` 1 when reduced (1.02 in the control run) |
| 7 | Accessibility quick pass | PASS | 1 `h1`; 16/16 img with alt; 21/21 buttons named; `aria-modal="true"` |
| 8 | taste-skill checker | FAIL (6 real) | consistency: 171 FAIL / 29 WARN raw, 6 real; check.mjs could not run on this markup; perf: 0 FAIL, 6 WARN |
| 9 | Lighthouse mobile | FAIL against the spec's ≥ 90 | Performance 84 (median of 80/84/88); Accessibility 96 |

## 1. Hero fills the first screen (1440×900)

Measured with `getBoundingClientRect()` before any scroll (`scrollY` 0):

- `#statement` top = **900** (≥ 900).
- Hero `#top` top = 64 and height = **836** (900 − 64).

**PASS.** Screenshots: `task8-1440-hero@2x.png` and `task8-390-hero@2x.png` (2× scale).

## 2. Roll images

The page was scrolled top to bottom in 300 px steps, then the script waited for network idle.

| Width | `#rolls img` | complete with `naturalWidth > 0` | `#rolls figcaption` |
|---|---|---|---|
| 1440 | 14 | 14 | 0 |
| 1024 | 14 | 14 | 0 |
| 768 | 14 | 14 | 0 |
| 390 | 14 | 14 | 0 |

**PASS.** Full-page screenshots: `task8-1440-full.png`, `task8-1024-full.png`, `task8-768-full.png` and
`task8-390-full.png`.

Instagram covers:
- At every width, all 3 `iframe`s mount after scrolling.
- All three link lines are always rendered:
  - "Lover, You Should've Come Over · Jeff Buckley"
  - "Tuyo · Rodrigo Amarante"
  - "Love Ain't Always So Good"
- In the Playwright runs, the embed content does not load (sandbox). The cover slots show as empty boxes in the full-page screenshots, so the frames are **not verifiable** with Playwright.
- The taste checker's own Chrome did load all three reels. See `taste-shots/consistency/1440-18-scroll-reveal.jpg`.

## 3. Lightbox

At 1440×900, the first frame was clicked; its alt is "The solar corona glowing around the moon during totality."

| Step | Dialog `aria-label` | Position text (`aria-live`) | Focus |
|---|---|---|---|
| Open | the first frame's alt | `R1 · 01` | Close button |
| ArrowRight | "A living room with a TV at golden hour, sunlight striping the wall." | `R1 · 02` | Close |
| ArrowLeft | the first frame's alt | `R1 · 01` | Close |
| Escape | dialog removed (0 `[role=dialog]`) | none | `document.activeElement` = the first frame's button (true) |

Note: the dialog's `aria-label` is the frame's alt text, as Lightbox.tsx implements it. The `R1 · 02` label
is the `aria-live` position line inside the dialog.

Swipe at 390×844:
- Touch context, with a CDP `Input.dispatchTouchEvent` swipe from x 320 to x 80 at y 422.
- The dialog moved from `R1 · 01` to `R1 · 02`.
- No mouse fallback was needed.

**PASS.** Screenshots: `task8-1440-lightbox.png` and `task8-390-lightbox.png`.

## 4. Drafts player

1440×900. A wrapper on `HTMLMediaElement.prototype.play` recorded any promise rejection.

| Step | `aria-pressed` (Fog, Untitled 1, Dragonfly) | `audio.paused` |
|---|---|---|
| Initial | false, false, false | true, true, true |
| Play row 1 | **true**, false, false | **false**, true, true |
| Play row 2 | false, **true**, false | true, **false**, true |
| Row 2 again (pause) | false, false, false | true, true, true |

There were 0 `play()` rejections, and never more than one `aria-pressed="true"` at a time. **PASS.**

## 5. 390×844 layout

- 14 frame buttons, all at x = **16**, so the rolls are one column.
- `document.documentElement.scrollWidth` = **390**, as are `body.scrollWidth` and `clientWidth`.
- `scrollTo(500, 0)` leaves `scrollX` = 0.
- The hero text block is readable: white Fraunces name and Manrope line on the bottom gradient. See `task8-390-hero@2x.png`.

**PASS.**

## 6. Reduced motion

The context was created with `reducedMotion: "reduce"`, and `emulateMedia({ reducedMotion: "reduce" })` was also called;
`matchMedia('(prefers-reduced-motion: reduce)')` was true. The first frame was hovered and the result read 700 ms later.

| | `transform` | `scale` |
|---|---|---|
| Reduced, before hover | none | none |
| Reduced, after hover | none | **1** (identity) |
| Control (no preference), after hover | none | 1.02 |

Tailwind v4 drives the zoom through the CSS `scale` property, not `transform`, so both were read.
**PASS.**

## 7. Accessibility quick pass

- `h1` count: **1** ("Ahnaf Labib").
- `img`: 16 in total, and none has an empty or missing alt.
- `button`: 21 in total, and none lacks an accessible name. In the dialog they are "Close", "Previous frame" and "Next frame".
- `a`: 16 in total, and none is unnamed. The social icons have `aria-label`.
- Dialog: `aria-modal="true"`.

**PASS.** Contrast is not part of this quick pass. Contrast failures appear under checks 8 and 9.

## 8. taste-skill checker

To render the creative persona, the check used `dist/artist.html`. This was a temporary copy of `dist/index.html` with
`data-persona="creative"` on `<html>` and an inline script as the first child of `<head>`:
`localStorage.setItem("portfolio-persona","creative")` plus `sessionStorage.setItem("intro-played","1")` to skip
the intro. All runs used the profile `<scratchpad>/taste-profile` and `--root dist`. The copy was deleted afterwards.

### consistency.mjs

```
node .claude/skills/taste-skill/scripts/consistency.mjs dist/artist.html --root dist \
  --widths 1440,1024,820,768,390 --rhythm-widths 1440,820,768,390 --profile <profile> \
  --page service --category "photographs and music" --primary "See the rolls"
```

- It ran for 6 min 56 s and exited 1.
- Raw totals: **171 FAIL, 29 WARN**. By width: 1440: 45, 1024: 12, 820: 39, 768: 40, 390: 35.
- Raw output: `taste-shots/consistency.txt`. Crops and `report.json`: `taste-shots/consistency/`.
- Most raw FAILs repeat across widths.
- Below, they are grouped by check and distinct message. The message text is verbatim and pixel values are from 1440 unless a width is stated.

**Real findings (6)**

| # | Check, widths | Finding (verbatim) | Verdict |
|---|---|---|---|
| R1 | text-contrast, all | "a caption, label or muted line in #95897a on #f6f1e7 reads 3.04:1 (needs 4.5:1); 11 like it, like "R1", "R2", "R3"" (`section#statement p.mt-6.font-mono`, now line) | **real**. Lighthouse confirms it (3.03:1 on 11 nodes: roll numbers, the now line, drafts line, draft times, "for work inquiries" button, footer line). Recommend a fix: darken the creative `--color-ink-faint` (now `#95897a`, src/index.css:38) to at least 4.5:1 on `#f6f1e7`. |
| R2 | text-contrast, 1440/1024/820/768 | "a caption, label or muted line in #dd4f26 on #f6f1e7 reads 3.57:1 (needs 4.5:1); 4 like it, like "Contact", "MORE ON INSTAGRAM → @I", "@LABIB.ONRECORD →"" | **real** for the 12 px accent text links ("More on Instagram → …", "@labib.onrecord →") and the active nav item. Lighthouse confirms the two links. The logo's "." is decorative. Recommend a fix: add a darker accent for text (≥ 4.5:1) and keep `#dd4f26` for fills and rules. |
| R3 | text-contrast, all | "a caption, label or muted line in #fffcf5 on #dd4f26 reads 3.93:1 (needs 4.5:1)" (`section#contact a.mt-10.inline-flex`, "Say hello") | **real**: 16 px medium is normal-size text. Lighthouse confirms it at 3.92:1. The same pair is the active "Artist" pill in the shared PersonaToggle; see FP list, item 9. Recommend a fix: darken the button fill or the accent token so `accent-ink` on `accent` reaches 4.5:1. |
| R4 | off-grid, 1440 | "left edge at 168px, 24px off the page margin at 144px (23 elements); 1 more in this section off the grid too (p.mt-1 at 168px)" (hero `h1`) | **real**. The spec puts the hero block "inside the `.wrap` edges". CreativeHero puts `px-4 sm:px-6` inside the `max-w-6xl` box, so the name and line sit 24 px inside every other section's edge. Recommend a fix: move the horizontal padding to the outer `absolute inset-x-0 bottom-0` wrapper, as the other sections do. |
| R5 | off-grid, 1440 and 390 | "left edge at 151px, 7px off the page margin at 144px (23 elements, like a.mt-2.block)" (cover `iframe`); at 390 "(36 elements, like a.mt-3.inline-block); 2 more in this section off the grid too (iframe…)" | **real, minor**. The cover frame is capped at `70vh*9/16` and centred with `mx-auto`, so it is narrower than its column. Its link line starts at the column edge, which leaves frame and caption 7 px (1440) or 13 px (390) apart. Recommend a fix: drop `mx-auto` so the frame is left-aligned with its link line. |
| R6 | centre-axis, all | "centred text 28px right of the middle of its page (748px against 720px)" (contact eyebrow "CONTACT") | **real, minor**. The 40 px accent rule before the word shifts the centred word right. Recommend a fix: add a matching rule after the word, or drop the rule. |

**False positives**

| Check (raw count) | Finding (verbatim, first instance) | Reason |
|---|---|---|
| scroll-reveal (5) | "3 parts of this section animate in when scrolled into view (is split into lines that rise in): div.mx-auto.w-full ×3" | False positive. These are the three Instagram cover slots: an empty `bg-surface-2` box is swapped for the iframe when an IntersectionObserver fires (lazy third-party embed). The page has no fade, rise or unmask CSS. |
| no-visual (4) | "no picture, effect or mock in this section; a feature section needs a visual" (`#statement`) | False positive. The Statement has the 96 px headshot the spec asks for. The rule assumes feature sections of a company page. |
| text-only (5) | "the closing section is only text: no picture, icon, mock or effect in it" (`#contact`) | False positive. The section does have the mail icon and four social icons. A text closing is right for a personal page. |
| cta (5) | "the hero has no button (the nav's does not count)" | False positive. By spec the hero's one action is the mono link "See the rolls ↓". It is a personal page with nothing to buy. |
| copy-headline (1) | ""Ahnaf Labib" does not name what is sold (photographs and music…)" | False positive. This is a landing-page rule; the h1 is the artist's name by spec. |
| copy-fact (1) | "the first screen holds no number, price, date or place name" | False positive. This is a landing-page rule. The hero line does name places ("Greencastle, Indiana · Dhaka"). |
| copy-headings (1) | ""Light" names no product, part, place or section (6 headings like it…)" | False positive. Roll titles are names of photo series. |
| heading-scale (9) | "an h2 at 32px, as large as the h1 (24px) or larger"; "h2 headings in 2 sizes, 32px ("Light") to 80px" | False positive by spec. The spec fixes the hero name at 1.5rem so the photograph is the headline, and the contact headline is "kept from today". Note for taste: the 80 px "Say hello." is the loudest type on the page. |
| text-contrast (1 of 7) | "body text in #5c554a on #f6f1e7 reads 6.54:1 (needs 7:1)" | False positive against WCAG. 6.54:1 meets AA (4.5:1); 7:1 is the kit's own bar (AAA). |
| text-contrast (1 of 7) | "a caption, label or muted line in #fffcf5 on #f6f1e7 reads 1.1:1" (PersonaToggle "Artist") | False positive in the ratio. The active pill is a separate animated layer behind the button, and the checker read the page ground. The real pair, `#fffcf5` on `#dd4f26` (3.93:1), is covered by R3. |
| links (1) | ""Ahnaf Labib." goes to "#", nowhere" | False positive. The shared Navbar logo has `onClick` that scrolls to the top, and `#` is the top of the page without JS too. |
| hero-screen (4), row-lines (4), container-edges full-width image | "A total solar eclipse at the dia" ends below the hero's content line / past the container's right line / "full width is for background layers and grounds only" | False positive. The hero photograph is full-bleed by spec (the eclipse frame is the background layer). |
| section-height (27) | e.g. "the section is 3131px tall (3.5 screens), 1331px over two screens", "the section starts at …px below the screen grid", footer 0.2 screens | False positive. This is the kit's screen-grid rhythm. Rolls at 3.5 screens are within the spec's 2–4, and the footer is shared site chrome. |
| section-air (15) | "a rule (<hr>) between the section's content…"; "the content fills 27.7% of the section's height" (`#statement`) | False positive. The `<hr>` under each roll title is the spec's contact-sheet row. The Statement is two sentences by design. |
| one-section (12) | "the screen at scroll 900px (stride 1) shows 290px of section 2 and the content of 2 sections" | False positive with a note. The Statement is about 0.4 screens tall at 1440, so Rolls show below it. The spec's table lists the Statement as "1" screen, but filling a screen with two sentences would trip section-air. **Open for the controller**: decide whether the Statement should be taller. |
| one-heading (4) | "the section holds 4 h2 headings: one per section" | False positive. Each roll is an `article` with its own title, by spec. |
| container-edges (32) | "a <div> at the top of the page, outside header.nav, main, footer.closing…"; "the section needs exactly one in-flow child .wrap"; nav and footer edges | False positive. These are the kit's markup conventions (`.wrap`, `header.nav`, `footer.closing`), not page defects. Real edge mismatches are listed as R4 and R5. |
| split-pair (6) | "the split's left column starts with a picture or a box, not text"; "right column starts at x 272, on none of the split lines" | False positive. The spec puts the 96 px headshot beside the statement. The kit's split lines assume a 2-column feature split. |
| top-stagger (2, 820/768) | "2 boxes side by side start at different heights (+0, +Npx)" | False positive. Measured column tops align at every width; for example, at 820 roll 1 is at x 24 and x 416, both with y 1588. The checker compared two frames from the middle of the masonry. |

### check.mjs

```
node .claude/skills/taste-skill/assets/layout/check.mjs --url dist/artist.html --root dist --profile <profile> \
  --sizes 1440x900,1024x768,820x1180,768x1024,390x844 --shots .superpowers/sdd/2026-11-05-artist-page-redesign/taste-shots
```

It could not run on this page. The script exited 1 with:

```
check: Cannot read properties of undefined (reading 'map')
1440x900  lines x undefined and undefined, nav undefinedpx, one screen undefinedpx
TypeError: r.sections is not iterable   (check.mjs:174)
```

Cause: `layout-check.js` needs the kit's `.wrap` or `.container` markup. Without it, it returns a single finding and
no section data, and `check.mjs` then crashes. A rerun with `--json` and without `--shots` gives, at all 5 sizes:

```
{"rule":"container","where":"page","detail":"no .wrap"}   overflowX false
```

Verdict: false positive or not applicable, because the React page does not use the kit's markup. The one real
measurement it makes, horizontal overflow, is false at all five sizes. The kit files were not modified.

### perf.mjs

```
node .claude/skills/taste-skill/scripts/perf.mjs dist/artist.html --root dist --profile <profile>
```

The result was **0 FAIL, 6 WARN**. Raw output: `taste-shots/perf.txt`.

- Measurements at 1440 and 390:
  - FCP 188 / 176 ms (relative CPU)
  - LCP 220 / 212 ms
  - CLS 0.000
  - TBT 0 ms
  - 0 broken requests
- WARN, total transfer 2356 KiB at 1440 and 2692 KiB at 390. Media accounts for 1237 KiB and 1792 KiB. Those totals come after the checker scrolls to the end. The three draft MP3s total about 1.8 MB, and despite `preload="metadata"` they were fetched in full from the checker's static server. Worth `preload="none"` as a follow-up.
- WARN, 3 font families (Fraunces, JetBrains Mono, Manrope).
- WARN, oversized images: `ahnafLabib-artist.jpg` is 800 px wide but shown at 96 px. At 390 `hero.jpg` is also flagged (2000 px shown at 390, though only 20 KB).

## 9. Lighthouse (mobile)

```
npx --yes lighthouse@latest http://localhost:4174/artist.html --form-factor=mobile \
  --chrome-flags="--headless --no-sandbox" --chrome-path=/opt/pw-browsers/chromium \
  --only-categories=performance,accessibility --output=json --output-path=…/lighthouse.json --quiet
```

- Lighthouse version: 13.6.0. The `--preset=mobile` flag from the brief is rejected by this version ("Choices: perf, experimental, desktop"), so `--form-factor=mobile` was used instead; it is the default with simulated throttling.
- Served by `vite preview` from the temporary `dist/artist.html`.
- Report: `lighthouse.json`, from the first run.

| Run | Performance | Accessibility | LCP |
|---|---|---|---|
| 1 | 84 | 96 | 4.4 s |
| 2 | 80 | 96 | 4.8 s |
| 3 | 88 | 96 | 3.9 s |

Median **Performance 84**, which is below the spec's ≥ 90, so **FAIL**. **Accessibility 96**.

- Run 1 metrics: FCP 1.5 s, TBT 50 ms, CLS 0 and Speed Index 2.3 s.
- The LCP element is the hero `img`.
- The only accessibility failure is `color-contrast`, on 14 nodes. These are the same pairs as R1, R2 and R3.

Top opportunities:
1. **Render-blocking requests**, about 870 ms of FCP. The Google Fonts stylesheet (`fonts.googleapis.com/css2?...`) accounts for 916 ms and the app CSS for 156 ms. Self-hosting the fonts, or preloading them and loading the CSS without blocking, would remove this.
2. **Unused JavaScript**, 61 KiB of the 124 KiB gzipped bundle, worth about 300 ms of LCP. The Dev persona's code ships in the same bundle; lazy-loading each persona would remove most of it.
3. **LCP request discovery and image delivery**. The hero image is "not discoverable in initial document" because React renders it, which leaves about 414 ms of resource-load delay. A `<link rel="preload" as="image" fetchpriority="high">` for `/gallery/hero.jpg` in `index.html` would fix that. Image delivery could save an estimated 378 KiB: roll frames and the 800 px headshot shown at 96 px.

These were not optimised in this task.

## Cleanup

The temporary `dist/artist.html` and `dist/.taste-skill/` were removed after the runs, and the preview server was stopped.
No product code was changed.
