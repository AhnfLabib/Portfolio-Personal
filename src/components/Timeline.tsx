import { motion } from "framer-motion";
import type { TimelineEntry } from "../data/content";

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut" as const,
    },
  },
};

interface TimelineProps {
  entries: TimelineEntry[];
}

export default function Timeline({ entries }: TimelineProps) {
  return (
    /* Wrapper provides the positioning context for the groove */
    <div className="relative">
      {/* Soft groove carved into the surface — full-height vertical track */}
      <div
        aria-hidden="true"
        className="neu-inset-sm absolute bottom-0 left-[9px] top-0 w-2 rounded-full"
      />

      <motion.ol
        className="list-none p-0"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
      >
        {entries.map((entry, index) => {
          const isCurrent = entry.duration.includes("Present");
          return (
            <motion.li
              key={index}
              className="relative mb-8 pl-12 last:mb-0"
              variants={itemVariants}
              whileHover={{
                y: -3,
                transition: { duration: 0.2, ease: "easeOut" as const },
              }}
            >
              {/* Extruded circular dot marker on the groove */}
              <div
                aria-hidden="true"
                className="neu-raised-sm absolute left-[5px] top-7 flex h-4 w-4 items-center justify-center rounded-full"
              >
                {isCurrent && (
                  <span className="block h-1.5 w-1.5 rounded-full bg-accent opacity-60" />
                )}
              </div>

              {/* Entry card */}
              <div className="neu-raised rounded-3xl p-6 sm:p-8">
                {/* Header row */}
                <div className="mb-4 flex flex-wrap items-start gap-3 sm:gap-4">
                  {/* Org logo tile */}
                  <div className="neu-raised-sm flex-shrink-0 rounded-xl p-2">
                    <img
                      src={entry.logo}
                      alt={`${entry.org} logo`}
                      className="h-10 w-10 object-contain"
                    />
                  </div>

                  {/* Title + org; min width forces the duration pill to wrap below on narrow screens */}
                  <div className="min-w-[10rem] flex-1">
                    <h3 className="text-lg font-bold text-ink">{entry.title}</h3>
                    <p className="text-sm text-ink-soft">{entry.org}</p>
                  </div>

                  {/* Duration pill */}
                  <span className="neu-inset-sm flex-shrink-0 self-start whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold text-ink-faint">
                    {entry.duration}
                  </span>
                </div>

                {/* Description */}
                <p className="text-sm leading-relaxed text-ink-soft sm:text-base">
                  {entry.description}
                </p>
              </div>
            </motion.li>
          );
        })}
      </motion.ol>
    </div>
  );
}
