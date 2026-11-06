#!/usr/bin/env node
// One-off media pipeline for the Artist page.
//
//   node scripts/prepare-media.mjs --photos <dir> --audio <dir> --out public
//
// Crops any baked-in near-white film border first (see detectBorder), then
// turns the supplied original photographs into public/gallery/*.jpg (hero at
// 2000 px and roll frames at 1600 px on the long edge, plus -800 grid variants
// at 800 px on the long edge; EXIF stripped,
// progressive mozjpeg), transcodes the draft recordings to
// public/audio/<slug>.mp3, and writes scripts/media-manifest.json with the
// Frame/Roll/Draft objects to paste into content.ts. Originals are not
// committed. Importing this module does not run the pipeline.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Supplied file names (the owner's numbering) → hero and rolls, in order. */
export const PHOTO_MAP = {
  hero: "8.jpg",
  rolls: {
    light: ["9.jpg", "5.jpg", "10.jpg", "6.jpg", "19.jpg"],
    street: ["7.jpg", "18.jpg", "12.jpg", "20.jpg"],
    stage: ["13.jpg", "14.jpg", "15.jpg", "16.jpg"],
    portrait: ["11.jpg"],
  },
};

const ROLL_TITLES = { light: "Light", street: "Street", stage: "Stage", portrait: "Portrait" };

/** One plain sentence per frame, in PHOTO_MAP order. */
export const ALT = {
  hero: "A total solar eclipse at the diamond-ring moment.",
  rolls: {
    light: [
      "The solar corona glowing around the moon during totality.",
      "A living room with a TV at golden hour, sunlight striping the wall.",
      "A white cupola lit from inside at dusk, framed by trees.",
      "A dim living room with a glass coffee table and a checkered rug.",
      "A porch with two rocking chairs beside a large oak trunk.",
    ],
    street: [
      "A Dhaka metro platform under an “Uttara North” departure board.",
      "A ONE WAY sign in fog at night.",
      "A fisheye view from a car window of a brick downtown block.",
      "A blue Mercedes 560 SL on a highway at dusk, traffic cones ahead.",
    ],
    stage: [
      "A singer silhouetted against a red LED wall.",
      "A band silhouetted against a red wall, the drummer mid-hit.",
      "A guitarist bathed in blue light, eyes closed.",
      "A guitarist and a saxophonist backlit by stage beams.",
    ],
    portrait: ["Half a face in sunglasses whose lens is inked with chess taunts."],
  },
};

export const BUDGETS = { hero: 400 * 1024, grid: 120 * 1024, gridRelaxed: 200 * 1024, small: 120 * 1024 };
const Q_START = 80;
const Q_MIN = 60;
const Q_STEP = 5;

const pad2 = (n) => String(n).padStart(2, "0");
const stripPrefix = (name) => name.replace(/^[0-9a-f]{8}-/i, "");
const stripExt = (name) => name.replace(/\.[^.]+$/, "");

/** "1164959c-Untitled_1.qta" → "untitled-1" */
export function slugify(name) {
  return stripExt(stripPrefix(name))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const frameFile = (rollIndex, frameIndex) => `r${rollIndex + 1}-${pad2(frameIndex + 1)}`;

function altFor(id, f) {
  const alt = ALT.rolls[id]?.[f];
  if (!alt) throw new Error(`no alt text for roll "${id}" frame ${f + 1}`);
  return alt;
}

/**
 * entries = { hero: {width,height}, rolls: {light: [{width,height}], ...},
 *             drafts: [{title, slug, duration}] }
 * → { hero: Frame, rolls: Roll[], drafts: Draft[] }
 */
export function buildManifest(entries) {
  const hero = { src: "/gallery/hero.jpg", width: entries.hero.width, height: entries.hero.height, alt: ALT.hero };
  const rolls = Object.keys(PHOTO_MAP.rolls).map((id, r) => ({
    id,
    title: ROLL_TITLES[id],
    frames: (entries.rolls[id] ?? []).map((dim, f) => ({
      src: `/gallery/${frameFile(r, f)}.jpg`,
      width: dim.width,
      height: dim.height,
      alt: altFor(id, f),
    })),
  }));
  const drafts = (entries.drafts ?? []).map((d) => ({
    title: d.title,
    src: `/audio/${d.slug}.mp3`,
    month: "",
    duration: Math.round(d.duration),
  }));
  return { hero, rolls, drafts };
}

/** Baked-in film borders: an edge row/column whose mean luminance is above
 * BORDER_LUMA counts as border. Cropping needs at least BORDER_MIN px of it on
 * every side (so ordinary photos with a bright sky edge are untouched), then
 * insets BORDER_INSET px further so no light seam survives. */
export const BORDER_LUMA = 235;
export const BORDER_MIN = 8;
export const BORDER_INSET = 2;
/** Scanned film can carry a 1-px darker seam at the very edge outside the
 * white border (r1-02/r1-04 do on their bottom row); skip up to this many. */
export const BORDER_SEAM = 3;
/** A scanned border fades into the picture over a few px rather than
 * stopping on a hard edge; the inset is measured from the end of that fade:
 * lines that keep getting darker by at least BORDER_RAMP_STEP per px, for at
 * most BORDER_RAMP_MAX px. */
export const BORDER_RAMP_MAX = 10;
export const BORDER_RAMP_STEP = 4;

/**
 * Given single-channel raw pixels, return the {left, top, width, height}
 * rectangle inside a near-white border, or null when there is no border on
 * all four sides.
 */
export function detectBorder({ data, width, height }) {
  const rowMean = (y) => {
    let sum = 0;
    for (let x = 0; x < width; x++) sum += data[y * width + x];
    return sum / width;
  };
  const colMean = (x) => {
    let sum = 0;
    for (let y = 0; y < height; y++) sum += data[y * width + x];
    return sum / height;
  };
  // Border thickness along one side: skip up to BORDER_SEAM outermost lines
  // that are not bright, count the run of bright ones, then the fade.
  const side = (mean, max) => {
    let i = 0;
    while (i < BORDER_SEAM && i < max && mean(i) <= BORDER_LUMA) i++;
    if (i >= max || mean(i) <= BORDER_LUMA) return 0;
    while (i < max && mean(i) > BORDER_LUMA) i++;
    for (let k = 0; k < BORDER_RAMP_MAX && i + 1 < max && mean(i) - mean(i + 1) >= BORDER_RAMP_STEP; k++) i++;
    return i;
  };
  const top = side(rowMean, height);
  const bottom = side((i) => rowMean(height - 1 - i), height - top);
  const left = side(colMean, width);
  const right = side((i) => colMean(width - 1 - i), width - left);
  if (Math.min(top, bottom, left, right) < BORDER_MIN) return null;
  const rect = {
    left: left + BORDER_INSET,
    top: top + BORDER_INSET,
    width: width - left - right - 2 * BORDER_INSET,
    height: height - top - bottom - 2 * BORDER_INSET,
  };
  return rect.width > 0 && rect.height > 0 ? rect : null;
}

/** The crop rectangle for `src` (after EXIF orientation), or null. */
export async function borderCrop(sharp, src) {
  const { data, info } = await sharp(src).rotate().removeAlpha().greyscale().raw().toBuffer({ resolveWithObject: true });
  return detectBorder({ data, width: info.width, height: info.height });
}

// Every variant is capped on its long edge (spec: "1600 px on the long edge"),
// so -800 is always half of the 1600 variant, portrait or landscape.
const longEdge = (px) => ({ width: px, height: px, fit: "inside", withoutEnlargement: true });

async function encode(sharp, src, edge, budgets, minEdge = edge) {
  const crop = await borderCrop(sharp, src);
  // Try each budget in turn (strict first); within one, step quality down.
  // If even the last budget cannot be met at Q_MIN, step the long edge down
  // (never below minEdge) rather than drop quality further: a smaller clean
  // image beats a blocky one on fine detail such as an LED wall.
  for (let e = edge; e >= minEdge; e -= 80) {
    const tryBudgets = e === edge ? budgets : budgets.slice(-1);
    for (const budget of tryBudgets) {
      for (let q = Q_START; q >= Q_MIN; q -= Q_STEP) {
        let img = sharp(src).rotate();
        if (crop) img = img.extract(crop);
        const { data, info } = await img
          .resize(longEdge(e))
          .jpeg({ quality: q, progressive: true, mozjpeg: true })
          .toBuffer({ resolveWithObject: true });
        if (data.length <= budget) return { data, info, quality: q, budget, scaled: e !== edge };
      }
    }
  }
  throw new Error(`${src}: cannot fit ${minEdge}-${edge}px within ${budgets.at(-1)} bytes at quality ${Q_MIN}`);
}

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

async function writeImage(sharp, src, out, edge, budgets, log, minEdge) {
  const { data, info, quality, budget, scaled } = await encode(sharp, src, edge, budgets, minEdge);
  writeFileSync(out, data);
  const notes = [];
  if (budget !== budgets[0]) notes.push(`relaxed budget ${kb(budget)}`);
  if (scaled) notes.push(`long edge reduced from ${edge}`);
  const note = notes.length ? `  (${notes.join("; ")})` : "";
  log.push(`${out}  ${info.width}x${info.height}  ${kb(data.length)}  q${quality}${note}`);
  return { width: info.width, height: info.height };
}

function probeDuration(file) {
  const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file], {
    encoding: "utf8",
  });
  return Number.parseFloat(out.trim());
}

/** The three drafts, in display order. Source files are found by slug. */
export const DRAFTS = [
  { slug: "fog", title: "Fog" },
  { slug: "untitled-1", title: "Untitled 1" },
  { slug: "dragonfly", title: "Dragonfly" },
];

/**
 * The file in `files` whose slugify() is `slug` ("1164959c-Fog.m4a" and
 * "Fog.m4a" both match "fog"). A .mp3 (this script's own output, if --audio
 * is reused) only counts when no other file matches. Throws on none or several.
 */
export function findDraftSource(files, slug) {
  const matches = files.filter((name) => slugify(name) === slug);
  const originals = matches.filter((name) => !/\.mp3$/i.test(name));
  const pick = originals.length ? originals : matches;
  if (pick.length === 0) throw new Error(`no file for draft "${slug}" (expected e.g. ${slug}.m4a)`);
  if (pick.length > 1) throw new Error(`several files for draft "${slug}": ${pick.join(", ")}`);
  return pick[0];
}

/** --photos <dir> --audio <dir> --out <dir>; photos and audio must exist. */
export function parseArgs(argv) {
  const value = (flag) => {
    const i = argv.indexOf(flag);
    const v = i === -1 ? undefined : argv[i + 1];
    if (!v || v.startsWith("--")) throw new Error(`missing value for ${flag} <dir>`);
    return resolve(v);
  };
  const args = { photos: value("--photos"), audio: value("--audio"), out: value("--out") };
  for (const flag of ["photos", "audio"]) {
    if (!existsSync(args[flag]) || !statSync(args[flag]).isDirectory()) {
      throw new Error(`--${flag} ${args[flag]} is not a folder`);
    }
  }
  return args;
}

async function run(argv) {
  const { photos, audio, out } = parseArgs(argv);
  const { default: sharp } = await import("sharp");

  const galleryDir = join(out, "gallery");
  const audioDir = join(out, "audio");
  mkdirSync(galleryDir, { recursive: true });
  mkdirSync(audioDir, { recursive: true });
  const log = [];

  const hero = await writeImage(sharp, join(photos, PHOTO_MAP.hero), join(galleryDir, "hero.jpg"), 2000, [BUDGETS.hero], log);
  const rolls = {};
  for (const [r, [id, files]] of Object.entries(PHOTO_MAP.rolls).entries()) {
    rolls[id] = [];
    for (const [f, file] of files.entries()) {
      const src = join(photos, file);
      const base = join(galleryDir, frameFile(r, f));
      rolls[id].push(await writeImage(sharp, src, `${base}.jpg`, 1600, [BUDGETS.grid, BUDGETS.gridRelaxed], log, 1280));
      await writeImage(sharp, src, `${base}-800.jpg`, 800, [BUDGETS.small], log);
    }
  }

  const available = readdirSync(audio);
  const drafts = [];
  for (const { slug, title } of DRAFTS) {
    const name = findDraftSource(available, slug);
    const dest = join(audioDir, `${slug}.mp3`);
    execFileSync("ffmpeg", ["-v", "error", "-y", "-i", join(audio, name), "-map", "0:a:0", "-ac", "2", "-ar", "44100", "-b:a", "128k", dest]);
    const duration = probeDuration(dest);
    drafts.push({ title, slug, duration });
    log.push(`${dest}  ${duration.toFixed(1)} s  ${kb(statSync(dest).size)}`);
  }

  const manifest = buildManifest({ hero, rolls, drafts });
  const manifestPath = join(dirname(fileURLToPath(import.meta.url)), "media-manifest.json");
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(log.join("\n"));
  console.log(`\nwrote ${manifestPath}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run(process.argv.slice(2)).catch((err) => {
    console.error(err.message ?? err);
    process.exit(1);
  });
}
