import { motion } from "framer-motion";
import { about, creative } from "../../data/content";
import SegmentedText from "./SegmentedText";

export default function CreativeStatement() {
  return (
    <section
      id="statement"
      className="scroll-mt-24 px-4 py-24 sm:px-6 sm:py-32"
    >
      <div className="mx-auto max-w-6xl">
        <p className="mb-12 flex items-center gap-4 text-xs font-semibold uppercase tracking-[0.35em] text-ink-soft">
          <span className="h-px w-10 bg-accent" aria-hidden="true" />
          <span>Statement</span>
        </p>

        <div className="grid gap-14 md:grid-cols-[1fr_auto] md:items-end md:gap-16">
          <motion.h2
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="font-display font-medium leading-[1.06] tracking-tight text-ink"
            style={{ fontSize: "clamp(1.9rem, 5.5vw, 3.75rem)" }}
          >
            <SegmentedText lines={creative.statement} />
          </motion.h2>

          <motion.figure
            initial={{ opacity: 0, rotate: -6, scale: 0.94 }}
            whileInView={{ opacity: 1, rotate: 3, scale: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
            className="relative mx-auto w-fit shrink-0 md:mx-0"
          >
            <span
              aria-hidden="true"
              className="absolute -top-3 left-1/2 h-6 w-20 -translate-x-1/2 -rotate-3 rounded-[2px] bg-accent/25"
            />
            <img
              src={about.image}
              alt="Ahnaf Labib"
              loading="lazy"
              className="h-36 w-36 rounded-full border-4 border-surface object-cover shadow-lg ring-1 ring-line sm:h-44 sm:w-44"
            />
            <figcaption className="mt-4 text-center font-mono text-xs uppercase tracking-widest text-ink-faint">
              the maker
            </figcaption>
          </motion.figure>
        </div>
      </div>
    </section>
  );
}
