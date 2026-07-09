import { motion, useReducedMotion } from "framer-motion";

interface Blob {
  /** radial tint — warm paper-light palette */
  color: string;
  size: string;
  top: string;
  left: string;
  opacity: number;
  drift: { x: number[]; y: number[]; scale: number[] };
  duration: number;
  delay: number;
}

const BLOBS: Blob[] = [
  {
    color: "var(--color-accent)",
    size: "42rem",
    top: "-8rem",
    left: "-6rem",
    opacity: 0.18,
    drift: { x: [0, 60, -20, 0], y: [0, 40, 80, 0], scale: [1, 1.12, 0.96, 1] },
    duration: 26,
    delay: 0,
  },
  {
    color: "#e6b25c", // soft gold
    size: "38rem",
    top: "20%",
    left: "55%",
    opacity: 0.16,
    drift: { x: [0, -70, 30, 0], y: [0, 50, -30, 0], scale: [1, 0.94, 1.1, 1] },
    duration: 22,
    delay: 1.5,
  },
  {
    color: "#cf8b84", // dusty rose
    size: "34rem",
    top: "50%",
    left: "10%",
    opacity: 0.14,
    drift: { x: [0, 50, -40, 0], y: [0, -50, 20, 0], scale: [1, 1.08, 0.98, 1] },
    duration: 30,
    delay: 3,
  },
];

/**
 * Aurora-style drifting light. Large, heavily blurred warm radial blobs move
 * slowly on transform/opacity only — like sunlight shifting across paper.
 */
export default function CreativeBackground() {
  const reduceMotion = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {BLOBS.map((blob, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            top: blob.top,
            left: blob.left,
            width: blob.size,
            height: blob.size,
            opacity: blob.opacity,
            background: `radial-gradient(circle at center, ${blob.color} 0%, transparent 70%)`,
            filter: "blur(90px)",
            transition: "none",
            willChange: reduceMotion ? undefined : "transform",
          }}
          animate={
            reduceMotion
              ? undefined
              : {
                  x: blob.drift.x,
                  y: blob.drift.y,
                  scale: blob.drift.scale,
                }
          }
          transition={
            reduceMotion
              ? undefined
              : {
                  duration: blob.duration,
                  delay: blob.delay,
                  repeat: Infinity,
                  repeatType: "mirror",
                  ease: "easeInOut",
                }
          }
        />
      ))}
    </div>
  );
}
