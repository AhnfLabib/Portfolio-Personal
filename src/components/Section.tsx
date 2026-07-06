import type { ReactNode } from "react";
import { motion } from "framer-motion";

interface SectionProps {
  id: string;
  label: string;
  title: string;
  children: ReactNode;
  className?: string;
}

/**
 * Shared section wrapper: consistent width, spacing, section label + title,
 * and a calm fade/rise reveal when scrolled into view.
 */
export default function Section({ id, label, title, children, className }: SectionProps) {
  return (
    <section id={id} className={`scroll-mt-24 px-6 py-16 sm:py-24 ${className ?? ""}`}>
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="mx-auto max-w-5xl"
      >
        <p className="neu-label mb-3">{label}</p>
        <h2 className="mb-10 text-3xl font-extrabold tracking-tight text-ink sm:mb-14 sm:text-4xl">
          {title}
        </h2>
        {children}
      </motion.div>
    </section>
  );
}
