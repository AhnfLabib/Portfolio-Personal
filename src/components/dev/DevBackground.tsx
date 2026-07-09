import { motion, useReducedMotion } from "framer-motion";

const GRID_MASK =
  "radial-gradient(ellipse 70% 60% at 50% 40%, #000 0%, transparent 78%)";

interface Beam {
  axis: "x" | "y";
  /** offset along a grid line (multiple of the 56px cell keeps it on a line) */
  offset: number;
  span: string;
  duration: number;
  delay: number;
}

/**
 * "Tracer beams" that streak along the grid lines — thin accent gradients that
 * travel across on staggered, differently-timed infinite loops. Transform- and
 * opacity-only so they stay GPU-composited.
 */
const BEAMS: Beam[] = [
  { axis: "x", offset: 224, span: "32vw", duration: 7, delay: 0 },
  { axis: "x", offset: 448, span: "26vw", duration: 9, delay: 2.4 },
  { axis: "y", offset: 336, span: "30vh", duration: 8, delay: 1.2 },
];

export default function DevBackground() {
  const reduceMotion = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <style>{`
        @keyframes devBeamX {
          0% { transform: translate3d(-45vw, 0, 0); opacity: 0; }
          12% { opacity: 1; }
          88% { opacity: 1; }
          100% { transform: translate3d(100vw, 0, 0); opacity: 0; }
        }
        @keyframes devBeamY {
          0% { transform: translate3d(0, -45vh, 0); opacity: 0; }
          12% { opacity: 1; }
          88% { opacity: 1; }
          100% { transform: translate3d(0, 100vh, 0); opacity: 0; }
        }
      `}</style>

      {/* Masked layer holds the grid + the traveling beams so both fade at edges */}
      <div
        className="absolute inset-0"
        style={{ maskImage: GRID_MASK, WebkitMaskImage: GRID_MASK }}
      >
        {/* Static masked grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to right, var(--color-line) 1px, transparent 1px), linear-gradient(to bottom, var(--color-line) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            opacity: 0.45,
          }}
        />

        {/* Tracer beams */}
        {!reduceMotion &&
          BEAMS.map((beam, i) =>
            beam.axis === "x" ? (
              <span
                key={i}
                className="absolute left-0"
                style={{
                  top: beam.offset,
                  width: beam.span,
                  height: "1.5px",
                  background:
                    "linear-gradient(90deg, transparent, var(--color-accent), transparent)",
                  transition: "none",
                  willChange: "transform, opacity",
                  animation: `devBeamX ${beam.duration}s ${beam.delay}s linear infinite`,
                }}
              />
            ) : (
              <span
                key={i}
                className="absolute top-0"
                style={{
                  left: beam.offset,
                  height: beam.span,
                  width: "1.5px",
                  background:
                    "linear-gradient(180deg, transparent, var(--color-accent), transparent)",
                  transition: "none",
                  willChange: "transform, opacity",
                  animation: `devBeamY ${beam.duration}s ${beam.delay}s linear infinite`,
                }}
              />
            ),
          )}
      </div>

      {/* Slow-breathing accent glow */}
      <motion.div
        className="absolute left-1/2 top-1/3 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--color-accent) 18%, transparent) 0%, transparent 62%)",
          transition: "none",
        }}
        animate={
          reduceMotion ? undefined : { scale: [1, 1.14, 1], opacity: [0.55, 0.85, 0.55] }
        }
        transition={
          reduceMotion
            ? undefined
            : { duration: 8, repeat: Infinity, ease: "easeInOut" }
        }
      />
    </div>
  );
}
