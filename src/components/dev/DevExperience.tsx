import { motion } from "framer-motion";
import Section from "../Section";
import { experience } from "../../data/content";

export default function DevExperience() {
  return (
    <Section id="experience" index="02" label="experience" title="Where I've worked">
      <ol className="relative ml-2 space-y-10 sm:ml-0">
        {/* Vertical hairline */}
        <span
          aria-hidden="true"
          className="absolute left-[7px] top-2 bottom-2 w-px bg-line sm:left-[9px]"
        />

        {experience.map((entry, i) => (
          <motion.li
            key={`${entry.org}-${entry.title}`}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: i * 0.05, ease: "easeOut" }}
            className="relative pl-8 sm:pl-10"
          >
            {/* Accent node */}
            <span
              aria-hidden="true"
              className="absolute left-0 top-1.5 z-10 h-[15px] w-[15px] rounded-full border-2 border-accent bg-bg sm:h-[19px] sm:w-[19px]"
            />

            <p className="mb-2 font-mono text-xs tracking-wide text-accent">
              {entry.duration}
            </p>

            <div className="rounded-xl border border-line bg-surface p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-surface-2">
                  <img
                    src={entry.logo}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    className="h-7 w-7 object-contain"
                  />
                </span>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-ink">{entry.title}</h3>
                  <p className="font-mono text-sm text-ink-soft">{entry.org}</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                {entry.description}
              </p>
            </div>
          </motion.li>
        ))}
      </ol>
    </Section>
  );
}
