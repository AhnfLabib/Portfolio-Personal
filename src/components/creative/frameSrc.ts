import type { Frame } from "../../data/content";

/** The grid variant prepare-media writes next to every frame. */
export function srcFor800(src: string): string {
  return src.replace(/\.jpg$/, "-800.jpg");
}

/** The -800 files are resized on the long edge, so portraits are narrower than 800. */
export function widthFor800(frame: Frame): number {
  return Math.round(800 * Math.min(1, frame.width / frame.height));
}

/** srcset with both files' real widths. */
export function frameSrcSet(frame: Frame): string {
  return `${srcFor800(frame.src)} ${widthFor800(frame)}w, ${frame.src} ${frame.width}w`;
}
