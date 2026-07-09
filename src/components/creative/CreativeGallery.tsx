import { motion } from "framer-motion";
import { about, creative } from "../../data/content";
import type { GalleryItem } from "../../data/content";

/** Film-grain overlay: tiny fractal-noise SVG inlined as a data URI. */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/** Rotate through a few aspect ratios so the masonry columns feel hand-set. */
const RATIOS = ["3 / 4", "1 / 1", "4 / 5", "5 / 4"];

function GalleryTile({ item, index }: { item: GalleryItem; index: number }) {
  const ratio = RATIOS[index % RATIOS.length];

  return (
    <motion.figure
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="group mb-5 block break-inside-avoid overflow-hidden rounded-xl border border-line"
    >
      <div className="relative" style={{ aspectRatio: ratio }}>
        {item.image ? (
          <img
            src={item.image}
            alt={`${item.title} — ${item.medium}`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <>
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `linear-gradient(145deg, ${item.palette[0]}, ${item.palette[1]})`,
              }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-[0.35] mix-blend-overlay"
              style={{ backgroundImage: GRAIN }}
            />
          </>
        )}

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/25 to-transparent p-4 pt-10">
          <figcaption className="font-display text-lg font-medium leading-tight text-white">
            {item.title}
          </figcaption>
          <p className="mt-0.5 font-mono text-[0.7rem] uppercase tracking-wider text-white/75">
            {item.medium}
          </p>
        </div>
      </div>
    </motion.figure>
  );
}

export default function CreativeGallery() {
  return (
    <section id="gallery" className="scroll-mt-24 px-4 py-24 sm:px-6 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <p className="mb-4 flex items-center gap-4 text-xs font-semibold uppercase tracking-[0.35em] text-ink-soft">
          <span className="h-px w-10 bg-accent" aria-hidden="true" />
          <span>Gallery</span>
        </p>
        <h2
          className="mb-12 font-display font-semibold tracking-tight text-ink"
          style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)" }}
        >
          A wall of{" "}
          <span className="italic text-accent">selected frames</span>
        </h2>

        <div className="gap-5 sm:columns-2 lg:columns-3">
          {creative.gallery.map((item, index) => (
            <GalleryTile key={item.title} item={item} index={index} />
          ))}
        </div>

        <motion.a
          href={about.instagram}
          target="_blank"
          rel="noreferrer"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="group mt-8 flex flex-col gap-3 rounded-2xl border border-line bg-surface-2 p-8 transition-colors duration-300 hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg sm:p-12"
        >
          <span className="font-mono text-xs uppercase tracking-widest text-accent">
            Instagram
          </span>
          <p
            className="font-display font-medium leading-tight text-ink"
            style={{ fontSize: "clamp(1.5rem, 4vw, 2.5rem)" }}
          >
            The real gallery lives on Instagram{" "}
            <span
              aria-hidden="true"
              className="inline-block text-accent transition-transform duration-300 group-hover:translate-x-1.5"
            >
              →
            </span>{" "}
            <span className="italic text-accent">@itsded_inside</span>
          </p>
        </motion.a>
      </div>
    </section>
  );
}
