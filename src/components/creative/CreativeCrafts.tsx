import { motion } from "framer-motion";
import { Camera, Music, PenTool } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Section from "../Section";
import { creative } from "../../data/content";
import type { CraftIcon } from "../../data/content";

const craftIcons: Record<CraftIcon, LucideIcon> = {
  Camera,
  Music,
  PenTool,
};

export default function CreativeCrafts() {
  return (
    <Section id="crafts" label="Crafts" title="Three ways I make things">
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        variants={{ show: { transition: { staggerChildren: 0.1 } } }}
        className="grid gap-6 md:grid-cols-3"
      >
        {creative.crafts.map((craft, index) => {
          const Icon = craftIcons[craft.icon];
          const numeral = `No. 0${index + 1}`;
          return (
            <motion.a
              key={craft.title}
              href={craft.link}
              target="_blank"
              rel="noreferrer"
              variants={{
                hidden: { opacity: 0, y: 24 },
                show: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
                },
              }}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface p-8 transition-colors duration-300 hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-accent opacity-0 transition-opacity duration-300 group-hover:opacity-[0.06]"
              />
              <div className="relative flex flex-1 flex-col">
                <div className="flex items-center justify-between">
                  <span className="font-display text-2xl font-medium italic text-ink-faint">
                    {numeral}
                  </span>
                  <Icon
                    className="h-6 w-6 text-accent"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </div>

                <h3 className="mt-10 font-display text-3xl font-semibold tracking-tight text-ink">
                  {craft.title}
                </h3>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-ink-soft">
                  {craft.description}
                </p>

                <span className="mt-8 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-accent">
                  Explore
                  <span
                    aria-hidden="true"
                    className="transition-transform duration-300 group-hover:translate-x-1.5"
                  >
                    →
                  </span>
                </span>
              </div>
            </motion.a>
          );
        })}
      </motion.div>
    </Section>
  );
}
