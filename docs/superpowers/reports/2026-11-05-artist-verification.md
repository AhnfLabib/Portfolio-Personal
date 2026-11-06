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

## Task 9 re-verification

Date: 2026-11-05. Branch `artist-redesign`, Task 9 fixes on top of `b902c76`. The setup matched Task 8:
`npm run build`, `npx vite preview --port 4174`, and a temporary `dist/artist.html` for the checker and
Lighthouse runs, deleted afterwards. Raw outputs are in `.superpowers/sdd/2026-11-05-artist-page-redesign/task9-shots/`
(git-ignored): `verify.json` (Playwright), `consistency.txt` plus `consistency/`, and `lighthouse-{1,2,3}.json`.
The Playwright script is `task9-verify.cjs`.

### What changed

- **Contrast.** Only the creative token block in `src/index.css` changed. `src/theme.test.ts` parses
  that block and asserts the ratios.

  | Token | Before | After | Pair | Ratio |
  |---|---|---|---|---|
  | `--color-ink-faint` | `#95897a` | `#6b6253` | on `bg` `#f6f1e7` | 3.04 → **5.33** |
  | `--color-accent` | `#dd4f26` | `#b9371a` | on `bg` | 3.57 → **5.15** |
  | `--color-accent` | | | `accent-ink` `#fffcf5` on it | 3.93 → **5.65** |
  | `--color-accent-soft` | `#f0663c` | `#d04a2a` | not used for text | (3.97 on `bg`) |

- **Alignment.**
  - Hero: the `px-4 sm:px-6` moved to the outer `absolute inset-x-0 bottom-0` wrapper.
  - Covers: `mx-auto` was dropped on the frame, which keeps `max-w-[calc(70vh*9/16)]`.
  - Contact eyebrow: the accent rule was removed.
- **Performance.**
  - Google Fonts load without blocking render: `media="print" onload` plus a `<noscript>` fallback, still with `display=swap`.
  - `index.html` preloads the hero image (`fetchpriority="high"`).
  - Each persona is now a `React.lazy` chunk inside `<Suspense>`, inside the existing fade.
  - `DraftPlayer` uses `preload="none"`.
- **Two follow-on fixes the lazy split required.** Both were found during this re-verification.
  - **Navbar scroll-spy.** The spy ran once on mount, before the lazy sections existed. It found none and
    never marked the current section, on either persona. The checker's `nav-current` changed from PASS to WARN.
    `Navbar.tsx` now watches the DOM with a `MutationObserver` until the sections mount.
    Test: `src/components/Navbar.test.tsx`.
  - **Footer layout shift.** With `fallback={null}`, the footer painted at the bottom of the first screen and then
    jumped down when the persona arrived. Lighthouse measured CLS 0.20. The fallback is now a screen-tall,
    `aria-hidden` placeholder (`min-h-svh`), and CLS is back to 0. Test: `src/App.test.tsx`.

### Alignment, measured with Playwright

| Item | Width | Before (Task 8) | After |
|---|---|---|---|
| Hero `h1` left vs. section `.wrap` left | 1440 | 168 vs 144 (24 px in) | **144 vs 144** |
| Hero CTA right vs. `.wrap` right | 1440 | 1272 vs 1296 (derived from the 24 px inset) | **1296 vs 1296** |
| Hero `h1` left | 390 | 16 vs 16 | 16 vs 16 |
| Cover frame x vs. its link line x | 1440 | 151 vs 144 (7 px) | **144/536/928 = 144/536/928** |
| Cover frame x vs. its link line x | 390 | 13 px apart | **16 = 16** |
| Contact eyebrow centre vs. page centre | 1440 | 748 vs 720 (28 px) | **720 vs 720** |
| Contact eyebrow centre vs. page centre | 390 | flagged at every width in Task 8 | **195 vs 195** |

### Accessibility quick pass (repeat of check 7)

At 1440 and 390:
- 1 `h1`.
- 16/16 `img` have alt text.
- 21/21 buttons are named.
- 16/16 links are named.
- The lightbox has `aria-modal="true"` and its buttons are "Close", "Previous frame" and "Next frame".

There were no page errors. **PASS.**

### Code split and the Dev persona

- **Artist**, 1440 and 390: the page requests `index-*.js`, `CreativePortfolio-*.js` and `mail-*.js`.
  No `DevPortfolio` chunk is requested. 0 `.mp3` requests on load, and `hero.jpg` is requested from the preload.
- **Dev**, 1440 and 390: the hero `#home` renders at full height (900 and 844), with `h1` "Ahnaf Labib",
  7 sections and the `#0a0d13` ground. No `CreativePortfolio` chunk is requested. In the screenshot the Dev hero is unchanged.
- **Flip**: Artist to Dev through the contact link loads the Dev chunk on demand (0 → 1 request) and renders it.
- **Nav scroll-spy** after the fix: `#music` is marked when scrolled into view on Artist, and `#projects` on Dev.
- **Build**:
  - Main chunk: 127.71 → 110.08 KiB gzip.
  - `CreativePortfolio`: 4.71 KiB.
  - `DevPortfolio`: 15.16 KiB.

### consistency.mjs (same flags as check 8)

Raw totals went from **171 FAIL / 29 WARN** to **148 FAIL / 27 WARN**. Each of the six real rows is gone:

| # | Task 8 finding | After |
|---|---|---|
| R1 | `#95897a` on `#f6f1e7` 3.04:1 | gone: 0 rows mention `#95897a` or `#6b6253` |
| R2 | `#dd4f26` on `#f6f1e7` 3.57:1 | gone: 0 rows mention `#dd4f26` or `#b9371a` |
| R3 | `#fffcf5` on `#dd4f26` 3.93:1 ("Say hello") | gone |
| R4 | hero off-grid 168 vs 144 | gone: `off-grid` PASS |
| R5 | cover frame 7 / 13 px off its link line | gone: `off-grid` PASS |
| R6 | contact eyebrow 28 px right of centre | gone: `centre-axis` PASS |

**Real FAILs after: 0.**

- The 10 `text-contrast` rows left are the two known false positives at each of the five widths:
  - PersonaToggle "Artist" read against the page ground (1.1:1).
  - `#5c554a` body text at 6.54:1 against the kit's 7:1 bar.
- Two WARNs were dropped:
  - `empty-visual` (2). The cause was not investigated.
  - `off-grid` (1).
- `nav-current` is PASS. It was WARN on the intermediate build, before the Navbar fix.
- All other categories match Task 8's false-positive list.

### Lighthouse mobile ×3 (13.6.0, same invocation as check 9)

| Run | Performance | Accessibility | FCP | LCP | TBT | CLS | SI |
|---|---|---|---|---|---|---|---|
| 1 | 88 | 100 | 0.8 s | 3.9 s | 40 ms | 0 | 2.6 s |
| 2 | 91 | 100 | 0.8 s | 3.5 s | 40 ms | 0 | 2.6 s |
| 3 | 84 | 100 | 0.8 s | 4.5 s | 40 ms | 0 | 2.6 s |

- Median **Performance 88**, up from 84 but still under the spec's ≥ 90 (one run reached 91).
- Median **Accessibility 100**, up from 96. `color-contrast` passes.
- FCP went from 1.5 s to 0.8 s.
- These audits now pass or shrink:
  - LCP request discovery: pass.
  - Render-blocking: about 870 ms → about 120 ms. Only the app CSS remains.
  - Unused JS: 61 → 45 KiB.

Remaining levers, none applied because each changes the design or goes beyond this task:
- **Hero render delay.** The LCP image arrives by about 50 ms (observed), but its element render delay is about 434 ms.
  The persona `motion.div` starts at opacity 0 and fades over 350 ms, and an image at opacity 0 is not an LCP candidate.
  Skipping the fade on first load (`initial={false}`), but keeping it on persona flips, is the largest remaining lever.
  It is a design call.
- **Image delivery**, about 378 KiB: roll frames, and the 800 px headshot shown at 96 px.
- **Unused JS**, 45 KiB in the shared chunk, mostly framer-motion.

For reference, the intermediate build had `fallback={null}` and no Navbar fix. It scored 88/85/87 with LCP 2.4–3.0 s
but CLS 0.20; the lower simulated LCP came with the footer jump. Simulated LCP varies by about ±0.5 s between runs here,
as it did in Task 8 (3.9–4.8 s).

## v2 re-verification (85e812f)

Date: 2026-11-06. Branch `artist-redesign` at `85e812f` (Task 13), against the v2 dark page: hero photo wall,
statement sticker, sticky rolls, music strip, big contact. Setup as before: `npm run build`,
`npx vite preview --port 4175`, Playwright (`chromium.launch()`) with `localStorage["portfolio-persona"]="creative"`
and `sessionStorage["intro-played"]="1"` set by `addInitScript`. The checker and Lighthouse used a temporary
`dist/artist.html` (persona set on `<html>` and in an inline script), deleted afterwards along with `dist/.taste-skill/`.
Raw outputs are in the session scratchpad (not committed): `v2-verify.cjs` / `v2-verify.json` (Playwright),
`v2-lh-{before,after}-{1,2,3}.json` (Lighthouse), `v2-taste/consistency.txt`, `v2-taste/check.{txt,json}` and the
checker crops in `v2-taste/consistency-artist/`.

Harness note: the page sets `scroll-behavior: smooth` on `html`, so stepped `window.scrollTo(0, y)` calls never reach
the bottom in a fast loop (the first run reported 0 iframes and 4 unloaded roll frames at 390 for that reason). All
numbers below come from runs that scroll with `behavior: "instant"`.

### Summary

| # | Check | Result | Key number |
|---|---|---|---|
| 1 | Hero alone on the first screen (1440×900) | PASS | `#statement` top = 900; `#top` 64 → 900 (836 tall) |
| 2 | Every roll frame renders | PASS | 17/17 `naturalWidth > 0` at 1440, 1024, 768 and 390; hero wall 5/5 |
| 3 | Lightbox from a roll frame: ← → Esc, focus return | PASS | R2 · 01 → R2 · 02 → R2 · 01; Esc removes the dialog; focus back on the opener |
| 4 | Covers strip mounts iframes after scroll | PASS (mount) | 3 iframes at every width; embed content not verifiable here (see below) |
| 5 | Drafts: one playing at a time | PASS | `paused` flips; never more than one `aria-pressed="true"`; 0 `play()` rejections |
| 6 | No horizontal scroll at 390 and 768 | PASS | `scrollWidth` 390 / 768; `scrollTo(500, y)` leaves `scrollX` 0 |
| 7 | Sticky roll meta at 1440 | PASS | `position: sticky; top: 96px`; meta top 96/96/96 while scrolling through roll 1 |
| 8 | Console errors | PASS | 0 page errors; 0 console errors in the final run (one earlier run logged an Instagram CSP report-only notice from inside the embed frame) |
| 9 | Accessibility (axe-core 4.14 + manual) | PASS after 2 fixes | 0 axe violations; focus ring missing on 4 links + 6 draft controls → fixed |
| 10 | Reduced motion | PASS | hero `settle` → `none`; roll hover scale 1; roll and lightbox transitions 0 |
| 11 | taste-skill checker | 170 FAIL / 47 WARN raw; 0 real FAIL left unfixed in code, 3 follow-ups | check.mjs still cannot run on this markup |
| 12 | Lighthouse mobile ×3 | FAIL against 90 | Performance median 80 → **85** after the LCP fix; Accessibility 100; Best practices 100 |
| 13 | Contrast | PASS | ink-faint/bg 5.29; accent/bg 5.01; hero strip worst case 7.25 (ink-soft) |

Full-page screenshots (deviceScaleFactor 2): `v2-1440.png`, `v2-1024.png`, `v2-768.png`, `v2-390.png`; plus
`v2-1440-lightbox.png`, `v2-1440-focus-cta.png`, `v2-1440-focus-frame.png` and the before/after focus crops
`v2-focus-{before,after}-{frame,cover-link,play,seek,contact}.png`. All in the scratchpad.

### 1–8. Functional checks

First screen, before any scroll:

| Width | `#top` top / height | `#statement` top | innerHeight |
|---|---|---|---|
| 1440×900 | 64 / 836 | **900** | 900 |
| 1024×768 | 64 / 704 | 768 | 768 |
| 768×1024 | 64 / 1722 | 1786 | 1024 |
| 390×844 | 64 / 1043 | 1107 | 844 |

At 1440 and 1024 (lg+) the wall is exactly one screen. Below lg the wall is taller than a screen by design (spec:
"On phones the name sits above a 2-column wall").

Images after a full instant scroll and network idle: `#rolls img` 17/17 complete with `naturalWidth > 0` at all four
widths; `#top img` 5/5. Hero `currentSrc` at 1440: `r4-02.jpg`, `r4-04.jpg`, `r3-01.jpg`, `r2-04.jpg`, `r4-03-800.jpg`.

Lightbox (1440, opened from roll 2 frame 1, "A Dhaka metro platform under an “Uttara North” departure board."):

| Step | Position (`aria-live`) | Focus |
|---|---|---|
| Open | R2 · 01 | Close |
| ArrowRight | R2 · 02 ("A ONE WAY sign in fog at night.") | Close |
| ArrowLeft | R2 · 01 | Close |
| Escape | dialog removed (0 `[role=dialog]`) | the opener button (`activeElement` aria-label matches) |

`aria-modal="true"`.

Covers: 3 `iframe`s (`instagram.com/reel/<id>/embed/`, each with a `title`) mount at all four widths once the strip
nears the viewport. Whether Instagram renders the reels inside them is **not verifiable** in this sandbox; the
Playwright screenshots show the frames, not confirmed reel content.

Drafts (1440):

| Step | `aria-pressed` (Fog, Untitled 1, Dragonfly) | `audio.paused` |
|---|---|---|
| Initial | false, false, false | true, true, true |
| Play row 1 | **true**, false, false | **false**, true, true |
| Play row 2 | false, **true**, false | true, **false**, true |
| Row 2 again | false, false, false | true, true, true |

Sticky meta (1440): every `[data-roll-meta]` is `position: sticky` at md+ (`static` at 390, where the meta sits
inline above the sheet). Roll 1 is 409 px tall; scrolled to 20/40/60 % of it, the article top was 14 / −67 / −149
while the meta top stayed **96 / 96 / 96**; after the roll it scrolls away (−497).

### 9. Accessibility

`axe-core` is not in the project's `node_modules`; version 4.14.0 was installed into the scratchpad only and
injected at 1440 after a full scroll (tags wcag2a/aa, wcag21a/aa, best-practice).

- **0 violations**, 45 passes.
- Incomplete (needs review): `color-contrast` ×10 (axe gives up over images or overlapping layers: the persona pill,
  the h1 and mono line on the frosted strip, the hero CTA, the aria-hidden ↓ glyph); `frame-tested` ×3 (the
  cross-origin Instagram iframes); `label-content-name-mismatch` ×3. The contrast items are covered by the manual
  check in section 13 and by Lighthouse's `color-contrast` (pass).

Manual:
- 1 `h1` ("Ahnaf Labib"). Heading order: H1 Ahnaf Labib → H2 Rolls → H3 Light / Street / Stage / Portrait → H2 Music
  → H3 Drafts → H2 Say hello. No skipped levels.
- 23/23 `img` have non-empty alt; 24/24 buttons and 15/15 links have an accessible name; all 3 iframes have a title.
- Focus visible: every focusable in the main document (42) was focused after a keyboard Tab. Nav links, logo and
  persona toggle show a ring (box-shadow). Hero CTA, roll frames, Instagram link and contact links show the 2 px accent
  outline. **Ten had only the browser's default `outline: auto`**: the `@labib.onrecord →` link, the three cover title
  links, and each draft's play button and seek slider. Chrome draws that as a thin white/dark ring that is visible on
  `#0e0d0b` (see `v2-focus-before-play.png`, `v2-focus-before-cover-link.png`), but it does not match the rest of the
  page and varies by browser. **Fixed** (class-only): `focus-visible:outline-2 focus-visible:outline-offset-{2,4}
  focus-visible:outline-accent` on those links (`CreativeMusic.tsx`) and controls (`DraftPlayer.tsx`). Re-run: 0
  focusables without the ring/outline (`v2-focus-after-*.png`).
- Reduced motion (`reducedMotion: "reduce"` context):

  | | No preference | Reduced |
  |---|---|---|
  | Hero frames `animation-name/duration` | frame 1 `none` (after the LCP fix), frames 2–5 `settle/0.6s` | all `none` |
  | Roll image `transition-duration` | 0.5 s | ~0 (1e-05 s) |
  | Roll frame hover `scale` | 1.02 | 1 |
  | Lightbox dialog `transition-duration` | 0.5 s | ~0 (1e-05 s) |

### 11. taste-skill checker

`consistency.mjs` with the Task 8 flags (`--widths 1440,1024,820,768,390 --rhythm-widths 1440,820,768,390
--page service --category "photographs and music" --primary "See the rolls"`), run after the fixes below were built.
Exit 1, raw **170 FAIL / 47 WARN** (Task 9: 148 / 27 on the paper page). By width: 1440 43, the rest in the
`consistency.txt` header lines. Grouped by check and distinct message:

**Real or partly real (none fixed in code; follow-ups)**

| Check | Finding (verbatim) | Verdict |
|---|---|---|
| contrast (1440, 1024) | "body text over a picture reads at 3.5:1 at its worst tenth (needs 4.5:1)" on `a.justify-self-end > span.text-accent` "↓" | **Partly real.** The accent ↓ in the hero CTA chip (`lg:bg-bg/75` over frame 5's light cardigan). The glyph is `aria-hidden` and the link text "See the rolls" (ink) passes; even `bg-bg/85` would only reach ≈3.3–3.6:1 over that photo. Follow-up: make the chip solid `lg:bg-bg` (accent on bg 5.01) or the arrow `text-ink`. Left as a design call. |
| heading-scale (all) | "h2 headings in 3 sizes, 32px ("Music") to 80px (x2.50)"; at 390 "an h3 at 32px, as large as the smallest h2 (32px)"; at 768/820 "an h2 at 80px, as large as the h1 (72px) or larger" | **Partly real.** "Say hello." at 5rem is the v2 spec. But the Music h2 (2rem) is smaller than the Rolls h2 (2.5/3rem) and equal to the roll h3s (2rem) — an inconsistency Task 12 introduced. Follow-up: give Music the Rolls h2 size. |
| empty-visual (390, slow line) | "the frame of ahnafLabib-artist.jpg is still empty 1 s after a tap … the file is 91 KB, 800px wide for a 128px frame" | **Real, perf.** Same headshot item as Task 8/9. Follow-up: a 256 px variant for the sticker. |

**False positives**

| Check (raw) | Finding (verbatim, first instance) | Reason |
|---|---|---|
| cut-text (3) | "1 line of its text sit where the box has no visible edge (its fill matches what is behind it there)" (hero name strip) | The strip is `bg-bg/85` on the page ground by design; the mono line sits inside the strip's padding, nothing is clipped (crop `1440-01-cut-text.jpg`). |
| hero-screen (1440) | ""Ahnaf Labib" starts at 64px, under the 65px nav" | The h1 box starts at 76; the 64 is the text range's content area, which a 7rem line at `leading-[0.92]` pushes above the line box. Visible caps start well below the nav. |
| hero-screen (390/768/820) | "the hero ends at 1895px on a 1180px screen, 715px below the fold" | Below lg the wall stacks by spec. |
| tilt (5), off-grid (5) | "rotated -4.0°"; "left edge at 140px, 4px off the page margin at 144px" (statement sticker) | The −4° sticker is the v2 spec; its rotated bounding box is what sits 4 px off. |
| text-contrast (5) | "#0e0d0b on #0e0d0b reads 1:1" (PersonaToggle "Artist") | Known: the active pill is a separate layer; the real pair is accent-ink on accent, 5.01:1. |
| scroll-reveal (5) | "3 parts of this section animate in when scrolled into view" (cover slots) | The lazy embed swap (empty box → iframe). No reveal animation. |
| no-visual (5), text-only (5), cta (8), copy-headline (2), copy-headings (1) | e.g. "the closing section is only text", "the last section before the footer ends with no button", ""Ahnaf Labib" does not name what is sold" | Landing-page rules. v2 spec: contact is a headline plus mono links, "no button"; the h1 is the name; the hero action is the mono link. |
| links (1) | ""Ahnaf Labib." goes to "#", nowhere" | Shared navbar logo, scrolls to top. |
| row-lines (12) | "a row of 3 items: its items are 800/800/239px tall"; "its last item ends at 1076px, the container's right line at 1296px"; "a sideways scroller: 160px of it hidden behind overflow-x: auto" | The asymmetric wall and the snap strip are both the v2 spec. |
| top-stagger (2) | "2 boxes side by side start at different heights (+0, +54px)" | CSS-columns masonry, as in Task 8. |
| section-height (31), section-air (9), one-section (16), one-heading (2), container-edges (32), split-pair (9) | e.g. "the section is 2632px tall (2.9 screens)", "a rule (<hr>) between the section's content", "a band: a box 80% of the section wide on a ground of its own" (drafts deck), "the section needs exactly one in-flow child .wrap" | The kit's screen-grid rhythm and markup conventions, as listed in Task 8. The `<hr>` is the roll meta rule and the deck card is the v2 spec. |

`check.mjs --sizes 1440x900,1024x768,768x1024,390x844` crashes as in Task 8 (`TypeError: r.sections is not iterable`,
check.mjs:174). With `--json`: at all four sizes `{"rule":"container","where":"page","detail":"no .wrap"}` and
`overflowX: false`. Not applicable to this markup; the one real measurement (no horizontal overflow) passes.

### 12. Lighthouse mobile ×3

`npx --yes lighthouse@latest http://localhost:4175/artist.html --form-factor=mobile --chrome-flags="--headless --no-sandbox"
--chrome-path=/opt/pw-browsers/chromium --only-categories=performance,accessibility,best-practices --output=json --quiet`.
Lighthouse 13.6.0 still rejects `--preset=mobile` ("Choices: perf, experimental, desktop"); `--form-factor=mobile`
is the same default mobile config.

LCP element: the large wall frame, `<img src="/gallery/r4-02.jpg" fetchpriority="high">` ("Two friends in dark coats
standing in a doorway at night."). Request is discoverable (preloaded), not lazy, prioritised.

**Before (85e812f):**

| Run | Perf | A11y | BP | FCP | LCP | TBT | CLS | SI | LCP render delay |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 79 | 100 | 100 | 0.8 s | 5.2 s | 130 ms | 0 | 2.9 s | 601 ms |
| 2 | 80 | 100 | 100 | 0.8 s | 5.2 s | 30 ms | 0 | 2.7 s | 527 ms |
| 3 | 80 | 100 | 100 | 0.8 s | 5.3 s | 30 ms | 0 | 2.6 s | 493 ms |

Median **80**. The image itself arrived in ~40–80 ms; the LCP breakdown's element render delay (~500–600 ms) matches
the 600 ms `settle` animation, which starts the LCP image at opacity 0. **The entrance fade was penalised.**

**Fix (trivially safe):** the large frame (slot 0) no longer gets `animate-settle` or a delay; frames 2–5 keep the
60 ms stagger and `motion-reduce:animate-none`. Test updated (`CreativeHero.test.tsx`).

**After:**

| Run | Perf | A11y | BP | FCP | LCP | TBT | CLS | SI | LCP render delay |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 84 | 100 | 100 | 0.8 s | 4.5 s | 30 ms | 0 | 2.7 s | 434 ms |
| 2 | 86 | 100 | 100 | 0.8 s | 4.2 s | 30 ms | 0 | 2.7 s | 449 ms |
| 3 | 85 | 100 | 100 | 0.8 s | 4.3 s | 30 ms | 0 | 2.6 s | 444 ms |

Median **Performance 85** (still under 90), **Accessibility 100**, **Best practices 100**.

Top opportunities (after):
1. **LCP render delay ~440 ms** remains: the persona `motion.div` in `App.tsx` starts at opacity 0 and fades in (Task 9's
   "largest remaining lever"). Skipping that fade on first load (`initial={false}`), keeping it on persona flips, is a
   design call and was not applied.
2. **Image delivery, est. 586 KiB.** `r3-01.jpg` (1520 w, 189 KB) is fetched for a 184×245 cell on mobile because slot 2/3
   `sizes` is `120vw` below lg (chosen in Task 11 for DPR 2 object-cover); `r4-02.jpg` (the LCP frame) has no `srcset`
   (1600 w for a 380 px cell); the 800 px headshot is shown at 120–128 px; no WebP/AVIF.
3. **Unused JavaScript, 45 KiB** in the shared chunk (est. 300 ms LCP), mostly framer-motion. Render-blocking app CSS:
   est. 90 ms FCP.

Also flagged (not scored): bf-cache, "The page has an unload handler in a sub frame" (the Instagram embeds).

### 13. Contrast

`src/theme.test.ts` still parses the creative block and asserts the v2 tokens (`bg #0e0d0b` … `accent-ink #0e0d0b`)
and the three ≥ 4.5:1 pairs; it passes. Spot checks (WCAG formula):

| Pair | Ratio |
|---|---|
| `ink-faint #8e8477` on `bg #0e0d0b` | **5.29** |
| `accent #e0522f` on `bg` | **5.01** |
| `accent-ink #0e0d0b` on `accent` | 5.01 |
| `ink-faint` on `surface-2 #1f1c19` (drafts deck) | 4.62 |
| `ink-soft #c9c1b3` on `surface-2` | 9.50 |
| Hero strip, theoretical worst case (`bg/85` over pure white → `#32312f`): ink-soft mono line / ink h1 | 7.25 / 11.19 |
| Hero strip, measured (text hidden, lightest rendered strip pixel): 1440 `rgb(40,39,36)` | ink-soft 8.37, ink 12.92 |
| Hero strip, measured: 390 `rgb(24,22,20)` (strip sits above the photo) | ink-soft 10.11, ink 15.61 |

At 1440 the strip overlaps the large frame by 32 px; the photo under it is dark.

### Spec drift

`docs/superpowers/specs/2026-11-05-artist-page-redesign.md`, Revision v2 → Rolls: `4 rolls · 15 frames` →
`4 rolls · 17 frames` (the page renders "4 rolls · 17 frames"; R4 gained the portraits in Task 11). Nothing else changed.

### Fixes in this commit

- `CreativeHero.tsx`: the large (LCP) wall frame paints at once; the other four keep the staggered `settle`.
  `CreativeHero.test.tsx` updated to match.
- `CreativeMusic.tsx`: accent focus outline on the `@labib.onrecord` link and the cover title links.
- `DraftPlayer.tsx`: accent focus outline on the play button and the seek slider.
- Spec: 15 → 17 frames.

### Follow-ups (not fixed)

1. Persona fade on first load holds LCP ~440 ms (`initial={false}` on first mount) — biggest lever to reach 90.
2. Image delivery: `srcset` for the LCP frame; revisit slot 2/3 `120vw` sizes below lg; a small headshot variant for
   the 120 px sticker; consider WebP/AVIF in `prepare-media`.
3. Hero CTA ↓ glyph over a light photo at 3.5:1 (decorative, `aria-hidden`): solid chip or ink arrow.
4. Music h2 is 2rem, smaller than the Rolls h2 and equal to the roll h3s; align heading sizes.
5. 45 KiB unused JS (framer-motion in the shared chunk).

### Final checks

On the final tree: `npm test` 25 files, **234/234 passed**; `npx tsc -b` clean; `npm run build` succeeded
(main chunk 110.08 KiB gzip).

## v2 follow-up (perf/polish)

Date: 2026-11-06. Branch `artist-redesign`, on top of `da28451`. Four follow-ups from the v2 re-verification.

### Changes

1. **Persona fade skipped on first load.** `App.tsx`: `<AnimatePresence mode="wait" initial={false}>`, so the persona
   present at first mount renders in its `animate` state; a later flip still mounts the new persona at `opacity: 0`
   and fades it in (exit → enter, `mode="wait"`). The shell carries `data-persona-shell` for the test.
   `App.test.tsx` (framer-motion not mocked): first render's shell style is not `opacity: 0`, before and after the
   lazy chunk resolves; for Artist → Dev and Dev → Artist a MutationObserver records the new shell's inline opacity
   at insertion (`"0"`) and the test waits for `"1"`. With `initial={false}` removed the test fails
   (`expected '0' not to be '0'`).
2. **`srcset` on the LCP frame.** `CreativeHero.tsx` slot 0 now gets `frameSrcSet` (`/gallery/r4-02-800.jpg 800w,
   /gallery/r4-02.jpg 1600w`) and `sizes="(min-width: 1024px) 50vw, 100vw"`. The preload in `index.html` gained the
   same `imagesrcset` / `imagesizes`. Test: slot 0 `srcset`/`sizes`, and the preload's attributes equal the img's.
   Lighthouse shows a single `r4-02-800.jpg` request (19 KB) for the LCP, so preload and img agree.
3. **Music heading rank.** `CreativeMusic.tsx` h2 `text-[2rem]` → `text-[2.5rem] sm:text-[3rem]` (`leading-tight`),
   same as the Rolls h2; test pins it. The contact h2 (`text-[3.25rem] sm:text-[5rem] leading-none tracking-tight`) is
   the v2 spec's display headline, not a trivial drift from Rolls, so it was left as is.
4. **Hero CTA arrow.** Worst case (lightest photo pixel = white) for the accent `#e0522f` on the chip `bg #0e0d0b` at
   alpha a: 75 % → 2.30, 85 % → 3.34, **90 % → 3.94**, 95 % → 4.53, solid → 5.01. `bg/90` is still under 4.5, so the
   arrow is now `text-ink` (`#f3eee4`) on the unchanged `lg:bg-bg/75` chip: **7.72:1** worst case (13.21 at 90 %).
   Computed colour in Chromium: `rgb(243, 238, 228)`. Test pins `text-ink`.

### Lighthouse mobile ×3

`npx --yes lighthouse@latest http://localhost:4173/artist.html --form-factor=mobile --chrome-flags="--headless
--no-sandbox" --chrome-path=/opt/pw-browsers/chromium --only-categories=performance,accessibility,best-practices
--output=json --quiet` against `npx vite preview --port 4173`, with a temporary `dist/artist.html` (persona
`creative` on `<html>`, `portfolio-persona` / `intro-played` set by an inline script), deleted afterwards. Raw JSON:
`v2f-lh-{1,2,3}.json` in the session scratchpad. Lighthouse 13.6.0.

| Run | Perf | A11y | BP | FCP | LCP | TBT | CLS | SI | LCP render delay |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 91 | 100 | 100 | 0.8 s | 3430 ms | 70 ms | 0.001 | 2.1 s | 471 ms |
| 2 | 91 | 100 | 100 | 0.8 s | 3497 ms | 20 ms | 0.001 | 2.1 s | 437 ms |
| 3 | 83 | 100 | 100 | 0.8 s | 4733 ms | 20 ms | 0 | 1.7 s | 453 ms |

Median **Performance 91** (was 85; target ≥ 90 met on the median, not on every run), LCP median 3497 ms (was
4.3 s), Accessibility 100, Best practices 100. LCP element: the large frame, now `currentSrc` `r4-02-800.jpg`.

LCP breakdown (runs 1/2/3): TTFB 11/7/8 ms, resource load delay 20/25/19 ms, load duration 15/12/9 ms, **element
render delay 471/437/453 ms**. The render delay did not fall with the fade gone: it is the time to download and run
the main bundle and the lazy `CreativePortfolio` chunk under simulated throttling before the img exists in the DOM,
not the opacity fade. The LCP gain comes from the lighter file (800w, 19 KB). Run 3 is the outlier (LCP 4.7 s with
the same breakdown, i.e. variance in the observed-to-simulated trace). Remaining opportunity: unused JavaScript,
est. 51 KiB.

Rendered cell / chosen file (Playwright, after network idle): 1440 DPR 1 cell 570×681 → `r4-02-800.jpg`; 1440 DPR 2
→ `r4-02.jpg`; 412 DPR 1.75 cell 380×380 → `r4-02-800.jpg`; 390 DPR 3 → `r4-02.jpg`.

### Concern

The large cell is portrait at lg (570×681) and square below sm, while `r4-02` is 16:9 under `object-cover`, so the
visible crop is about 1213 CSS px of source wide at 1440 and ~676 at 380. With `sizes` based on cell width, a DPR 1
desktop and a DPR 1.75 phone get the 800w file and upscale it (~1.5× at 1440). Sizing by cell height (as slots 2/3
do) would avoid that but send phones the 1600w file again. Left as specified; a mid-size (~1200w) variant in
`prepare-media` would fix both.

### Final checks

`npm test` 25 files, **237/237 passed**; `npx tsc -b` clean; `npm run build` succeeded (main chunk 110.09 KiB gzip,
CreativePortfolio 5.42 KiB gzip).
