import { motion, useReducedMotion } from "framer-motion";
import type { Variants } from "framer-motion";
import { creativeHero } from "../../data/content";
import SegmentedText from "./SegmentedText";
import Marquee from "./Marquee";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.14, delayChildren: 0.08 } },
};

const rise: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] },
  },
};

export default function CreativeHero() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="top"
      className="relative flex min-h-[calc(100svh-4rem)] flex-col justify-between overflow-hidden"
    >
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-16 sm:px-6"
      >
        <motion.div variants={rise} className="flex items-center gap-4">
          <motion.span
            aria-hidden="true"
            className="text-2xl text-accent"
            animate={reduceMotion ? undefined : { rotate: 360 }}
            transition={
              reduceMotion
                ? undefined
                : { duration: 20, ease: "linear", repeat: Infinity }
            }
          >
            ✳
          </motion.span>
          <span className="text-xs font-semibold uppercase tracking-[0.35em] text-ink-soft">
            {creativeHero.eyebrow}
          </span>
        </motion.div>

        <motion.h1
          variants={rise}
          className="mt-8 font-display font-semibold leading-[0.92] tracking-tight text-ink"
          style={{ fontSize: "clamp(2.75rem, 11vw, 8rem)" }}
        >
          <SegmentedText lines={creativeHero.headline} />
        </motion.h1>

        <motion.div variants={rise} className="mt-12">
          <a
            href="#gallery"
            className="group inline-flex items-center gap-3 rounded-full font-display text-xl italic text-ink transition-colors duration-200 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-bg sm:text-2xl"
          >
            {creativeHero.cta}
            <span
              aria-hidden="true"
              className="not-italic transition-transform duration-300 group-hover:translate-y-1"
            >
              ↓
            </span>
          </a>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.5 }}
        className="pb-10"
      >
        <Marquee items={creativeHero.marquee} />
      </motion.div>
    </section>
  );
}
