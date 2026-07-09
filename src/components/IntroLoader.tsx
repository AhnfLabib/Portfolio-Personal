import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Variants } from "framer-motion";
import { usePersona } from "../persona/PersonaContext";

const SESSION_KEY = "intro-played";
const NAME = "Ahnaf Labib";
const HOLD_MS = 1750;

/**
 * Decide synchronously (before first paint) whether the intro should run, so
 * the overlay is present on the very first frame — no flash of the site.
 */
function shouldPlayIntro(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.sessionStorage.getItem(SESSION_KEY) === "1") return false;
  } catch {
    /* storage unavailable (private mode) — fall through and still play once */
  }
  const prefersReduced =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return !prefersReduced;
}

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.18 } },
};

const letter: Variants = {
  hidden: { opacity: 0, y: "0.55em", filter: "blur(12px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.62, ease: [0.16, 1, 0.3, 1] },
  },
};

export default function IntroLoader() {
  const { persona } = usePersona();
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState<boolean>(shouldPlayIntro);

  useEffect(() => {
    if (!visible) return;
    try {
      window.sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* ignore — best effort session gate */
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => setVisible(false), HOLD_MS);
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, [visible]);

  if (reduceMotion) return null;

  const isDev = persona === "dev";
  const letters = Array.from(NAME);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="intro-loader"
          aria-hidden="true"
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-bg"
          style={{ transition: "none" }}
          initial={{ y: 0 }}
          exit={{ y: "-100%" }}
          transition={{ duration: 0.72, ease: [0.76, 0, 0.24, 1] }}
        >
          <div className="flex flex-col items-center">
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className={
                isDev
                  ? "flex items-baseline font-mono text-3xl font-semibold tracking-tight text-ink sm:text-5xl"
                  : "flex items-baseline font-display text-5xl font-semibold tracking-tight text-ink sm:text-7xl"
              }
            >
              {isDev && (
                <motion.span
                  variants={letter}
                  className="mr-2 text-accent"
                  style={{ transition: "none" }}
                >
                  &gt;
                </motion.span>
              )}
              {letters.map((char, i) => (
                <motion.span
                  key={`${char}-${i}`}
                  variants={letter}
                  className="inline-block"
                  style={{
                    transition: "none",
                    whiteSpace: char === " " ? "pre" : undefined,
                  }}
                >
                  {char}
                </motion.span>
              ))}
              {isDev && (
                <motion.span
                  aria-hidden="true"
                  className="ml-1 inline-block h-[0.9em] w-[0.5em] translate-y-[0.04em] self-center bg-accent"
                  style={{ transition: "none" }}
                  animate={{ opacity: [1, 1, 0, 0] }}
                  transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
                />
              )}
            </motion.div>

            {/* Accent underline draws in beneath the name */}
            <motion.span
              className="mt-5 block h-px origin-center bg-accent"
              style={{ transition: "none" }}
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="block w-40 sm:w-64" />
            </motion.span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
