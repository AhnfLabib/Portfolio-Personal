import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mail, ChevronDown } from "lucide-react";
import { hero } from "../data/content";

function useTypingAnimation(phrases: readonly string[]): string {
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    const phrase = phrases[phraseIndex];

    // Pause at the end of a fully typed phrase before erasing
    if (!isDeleting && displayText === phrase) {
      const t = setTimeout(() => setIsDeleting(true), 2000);
      return () => clearTimeout(t);
    }

    // Move to the next phrase once fully erased
    if (isDeleting && displayText === "") {
      setIsDeleting(false);
      setPhraseIndex((prev) => (prev + 1) % phrases.length);
      return;
    }

    const delay = isDeleting ? 50 : 100;
    const t = setTimeout(() => {
      setDisplayText((prev) =>
        isDeleting ? prev.slice(0, -1) : phrase.slice(0, prev.length + 1)
      );
    }, delay);

    return () => clearTimeout(t);
  }, [displayText, isDeleting, phraseIndex, phrases]);

  return displayText;
}

export default function Hero() {
  const typedText = useTypingAnimation(hero.roles);

  return (
    <section
      id="home"
      className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-20"
    >
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="flex flex-col items-center text-center gap-6"
      >
        {/* Greeting label */}
        <p className="neu-label">Hello, I'm</p>

        {/* Name */}
        <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-ink leading-tight">
          {hero.name}
        </h1>

        {/* Typing animation — fixed height prevents layout shift */}
        <div className="h-8 sm:h-10 flex items-center justify-center">
          <p className="text-xl sm:text-2xl font-medium text-ink-soft whitespace-nowrap">
            {typedText}
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{
                duration: 0.55,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "linear",
              }}
              aria-hidden="true"
              className="inline-block w-0.5 h-[1em] bg-accent ml-1 align-middle"
            />
          </p>
        </div>

        {/* CTA */}
        <a
          href="#contact"
          className="neu-btn inline-flex items-center gap-2 px-8 py-4 font-semibold text-ink-soft hover:text-ink mt-2 focus-visible:outline-2 focus-visible:outline-accent"
        >
          <Mail size={18} className="text-accent" />
          Contact Me
        </a>
      </motion.div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <motion.a
          href="#about"
          aria-label="Scroll to about section"
          animate={{ y: [0, 7, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="neu-btn w-12 h-12 flex items-center justify-center text-ink-soft hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
        >
          <ChevronDown size={20} />
        </motion.a>
      </div>
    </section>
  );
}
