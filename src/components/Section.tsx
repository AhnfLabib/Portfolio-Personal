import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { usePersona } from "../persona/PersonaContext";

interface SectionProps {
  id: string;
  /** Two-digit index like "01"; drives the mono eyebrow in the dev persona. */
  index?: string;
  label: string;
  title: string;
  kicker?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Shared section wrapper. Consistent width + rhythm, a persona-aware eyebrow
 * (mono `/01 label` for the engineer, small-caps + accent rule for the artist),
 * and a calm scroll reveal.
 */
export default function Section({
  id,
  index,
  label,
  title,
  kicker,
  children,
  className,
}: SectionProps) {
  const { persona } = usePersona();

  return (
    <section
      id={id}
      className={`scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28 ${className ?? ""}`}
    >
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="mx-auto max-w-5xl"
      >
        {persona === "dev" ? (
          <p className="mb-4 flex items-center gap-2 font-mono text-sm uppercase tracking-widest text-ink-faint">
            {index && <span className="text-accent">/{index}</span>}
            <span>{label}</span>
          </p>
        ) : (
          <p className="mb-4 flex items-center gap-4 text-xs font-semibold uppercase tracking-[0.35em] text-ink-soft">
            <span className="h-px w-10 bg-accent" aria-hidden="true" />
            <span>{label}</span>
          </p>
        )}

        <h2
          className={`mb-10 tracking-tight text-ink sm:mb-14 ${
            persona === "dev"
              ? "text-3xl font-extrabold sm:text-4xl"
              : "font-display text-4xl font-semibold sm:text-5xl"
          }`}
        >
          {title}
        </h2>

        {kicker}
        {children}
      </motion.div>
    </section>
  );
}
