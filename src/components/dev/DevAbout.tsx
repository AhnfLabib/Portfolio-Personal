import { motion } from "framer-motion";
import Section from "../Section";
import { about } from "../../data/content";

export default function DevAbout() {
  return (
    <Section id="about" index="01" label="about" title="Who I am">
      <div className="grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,18rem)_1fr] md:gap-14">
        {/* Portrait with accent offset frame */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="group relative mx-auto w-full max-w-xs md:mx-0"
        >
          <span
            aria-hidden="true"
            className="absolute inset-0 translate-x-3 translate-y-3 rounded-xl border border-accent"
          />
          <img
            src={about.image}
            alt="Ahnaf Labib"
            loading="lazy"
            className="relative z-10 w-full rounded-xl border border-line object-cover grayscale transition-all duration-500 group-hover:grayscale-0"
          />
        </motion.div>

        {/* Prose + stack */}
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.08 } },
          }}
        >
          <div className="space-y-5">
            {about.paragraphs.map((paragraph, i) => (
              <motion.p
                key={i}
                variants={{
                  hidden: { opacity: 0, y: 16 },
                  show: { opacity: 1, y: 0 },
                }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="leading-relaxed text-ink-soft"
              >
                {paragraph}
              </motion.p>
            ))}
          </div>

          <motion.ul
            variants={{
              hidden: { opacity: 0, y: 16 },
              show: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mt-8 flex flex-wrap gap-2"
            aria-label="Core tech stack"
          >
            {about.stack.map((item) => (
              <li
                key={item}
                className="rounded-full border border-line bg-surface px-3 py-1 font-mono text-xs text-ink-soft"
              >
                {item}
              </li>
            ))}
          </motion.ul>
        </motion.div>
      </div>
    </Section>
  );
}
