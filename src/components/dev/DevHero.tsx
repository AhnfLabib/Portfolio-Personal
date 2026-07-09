import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import { hero } from "../../data/content";
import DevBackground from "./DevBackground";

/**
 * Classic type-on / type-off marquee. Ported from the legacy Hero component so
 * the rhythm feels identical, just re-skinned for the engineer persona.
 */
function useTypingAnimation(phrases: readonly string[]): string {
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    const phrase = phrases[phraseIndex];

    if (!isDeleting && displayText === phrase) {
      const t = setTimeout(() => setIsDeleting(true), 2000);
      return () => clearTimeout(t);
    }

    if (isDeleting && displayText === "") {
      setIsDeleting(false);
      setPhraseIndex((prev) => (prev + 1) % phrases.length);
      return;
    }

    const delay = isDeleting ? 50 : 100;
    const t = setTimeout(() => {
      setDisplayText((prev) =>
        isDeleting ? prev.slice(0, -1) : phrase.slice(0, prev.length + 1),
      );
    }, delay);

    return () => clearTimeout(t);
  }, [displayText, isDeleting, phraseIndex, phrases]);

  return displayText;
}

interface TerminalLine {
  prompt: string;
  output: string;
}

const TERMINAL_LINES: TerminalLine[] = [
  { prompt: "$ whoami", output: "ahnaf — cs @ depauw · swe intern @ tenzer" },
  { prompt: "$ current --focus", output: "llm pipelines · react · teaching" },
];

export default function DevHero() {
  const typedText = useTypingAnimation(hero.rolesDev);
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="home"
      className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-4 pt-24 pb-20 sm:px-6"
    >
      {/* Animated grid + tracer beams + breathing glow */}
      <DevBackground />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center text-center"
      >
        <p className="font-mono text-sm tracking-widest text-accent sm:text-base">
          hi, my name is
        </p>

        <h1 className="mt-4 text-5xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-7xl">
          {hero.name}
        </h1>

        {/* Typing line — fixed height avoids layout shift */}
        <div className="mt-5 flex h-8 items-center justify-center sm:h-10">
          <p className="font-mono text-lg font-medium text-ink-soft sm:text-2xl">
            <span className="text-ink-faint">&gt; </span>
            {typedText}
            <motion.span
              animate={reduceMotion ? undefined : { opacity: [1, 1, 0, 0] }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "linear",
              }}
              aria-hidden="true"
              className="ml-1 inline-block h-[1.05em] w-[0.5em] translate-y-[0.12em] bg-accent"
            />
          </p>
        </div>

        {/* Fake terminal window */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25, ease: "easeOut" }}
          className="mt-10 w-full max-w-xl overflow-hidden rounded-xl border border-line bg-surface text-left shadow-2xl shadow-black/40"
        >
          <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-ink-faint/60" aria-hidden="true" />
            <span className="h-3 w-3 rounded-full bg-ink-faint/60" aria-hidden="true" />
            <span className="h-3 w-3 rounded-full bg-ink-faint/60" aria-hidden="true" />
            <span className="ml-2 font-mono text-xs text-ink-faint">
              ahnaf@portfolio: ~
            </span>
          </div>
          <div className="space-y-3 p-4 font-mono text-xs sm:text-sm">
            {TERMINAL_LINES.map((line, i) => (
              <motion.div
                key={line.prompt}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.5 + i * 0.35 }}
              >
                <p className="text-accent">{line.prompt}</p>
                <p className="mt-1 text-ink-soft">{line.output}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* CTAs */}
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <a
            href="#projects"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-7 py-3 font-mono text-sm font-medium text-accent-ink transition-transform duration-200 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            View Projects
            <ArrowRight size={16} />
          </a>
          <a
            href="#contact"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-line px-7 py-3 font-mono text-sm font-medium text-ink-soft transition-colors duration-200 hover:border-accent hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            Contact
          </a>
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.a
        href="#about"
        aria-label="Scroll to about section"
        animate={reduceMotion ? undefined : { y: [0, 7, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-6 left-1/2 z-10 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full border border-line text-ink-faint transition-colors duration-200 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        <ChevronDown size={20} />
      </motion.a>
    </section>
  );
}
