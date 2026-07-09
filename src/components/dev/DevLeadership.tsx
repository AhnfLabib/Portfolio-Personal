import { motion } from "framer-motion";
import Section from "../Section";
import { leadership } from "../../data/content";

export default function DevLeadership() {
  return (
    <Section id="leadership" index="05" label="leadership" title="Where I lead">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {leadership.map((entry, i) => (
          <motion.article
            key={`${entry.org}-${entry.title}`}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: (i % 2) * 0.06, ease: "easeOut" }}
            className="flex flex-col rounded-xl border border-line bg-surface p-5 transition-colors duration-300 hover:border-accent"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-surface-2">
                <img
                  src={entry.logo}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  className="h-6 w-6 object-contain"
                />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-ink">{entry.title}</h3>
                <p className="font-mono text-xs text-ink-soft">{entry.org}</p>
              </div>
            </div>

            <p className="mt-3 font-mono text-[11px] tracking-wide text-accent">
              {entry.duration}
            </p>

            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              {entry.description}
            </p>
          </motion.article>
        ))}
      </div>
    </Section>
  );
}
