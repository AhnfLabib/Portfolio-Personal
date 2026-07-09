import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import Section from "../Section";
import { education } from "../../data/content";

export default function DevEducation() {
  return (
    <Section id="education" index="04" label="education" title="Where I study">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="rounded-xl border border-line bg-surface p-6 sm:p-8"
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-surface-2">
            <img
              src={education.logo}
              alt=""
              aria-hidden="true"
              loading="lazy"
              className="h-11 w-11 object-contain"
            />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3 className="text-xl font-bold text-ink">{education.degree}</h3>
              <span className="font-mono text-xs text-accent">
                {education.location}
              </span>
            </div>

            <a
              href={education.url}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-1 inline-flex items-center gap-1 font-mono text-sm text-ink-soft transition-colors duration-200 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              {education.school}
              <ArrowUpRight size={14} />
            </a>

            <p className="mt-2 font-mono text-xs text-ink-faint">
              {education.minor}
            </p>

            <p className="mt-4 text-sm leading-relaxed text-ink-soft">
              {education.description}
            </p>
          </div>
        </div>
      </motion.div>
    </Section>
  );
}
