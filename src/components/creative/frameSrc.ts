import type { Frame } from "../../data/content";

/** The grid variant prepare-media writes next to every frame. */
export function srcFor800(src: string): string {
  return src.replace(/\.jpg$/, "-800.jpg");
}

/** The -800 files are resized on the long edge, so portraits are narrower than 800. */
export function widthFor800(frame: Frame): number {
  return Math.round(800 * Math.min(1, frame.width / frame.height));
}

/** srcset with every file's real width: -800, any extra variants, full; sorted by width. */
export function frameSrcSet(frame: Frame): string {
  const candidates = [
    { src: srcFor800(frame.src), width: widthFor800(frame) },
    ...(frame.variants ?? []),
    { src: frame.src, width: frame.width },
  ].sort((a, b) => a.width - b.width);
  return candidates.map((c) => `${c.src} ${c.width}w`).join(", ");
}
