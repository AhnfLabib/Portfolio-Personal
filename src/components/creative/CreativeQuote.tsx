import { motion } from "framer-motion";
import { quote } from "../../data/content";

export default function CreativeQuote() {
  return (
    <section id="quote" className="scroll-mt-24 px-4 py-24 sm:px-6 sm:py-32">
      <motion.blockquote
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="relative mx-auto max-w-4xl"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -left-2 -top-10 font-display leading-none text-accent sm:-left-6"
          style={{ fontSize: "clamp(5rem, 14vw, 10rem)" }}
        >
          &ldquo;
        </span>
        <p
          className="relative font-display font-medium italic leading-[1.12] tracking-tight text-ink"
          style={{ fontSize: "clamp(1.75rem, 5vw, 3.5rem)" }}
        >
          {quote.text}
        </p>
        <footer className="mt-10 flex items-center gap-4">
          <span className="h-px w-12 bg-accent" aria-hidden="true" />
          <cite className="font-mono text-sm uppercase not-italic tracking-widest text-ink-soft">
            {quote.author}
          </cite>
        </footer>
      </motion.blockquote>
    </section>
  );
}
