import { useReducedMotion } from "framer-motion";

interface MarqueeProps {
  items: string[];
}

/**
 * Slow, seamless editorial ticker. The track holds two identical groups and
 * translates by exactly one group width (-50%), so the loop is invisible. The
 * duplicate is aria-hidden. Under reduced motion the animation is dropped and
 * the strip renders static.
 */
export default function Marquee({ items }: MarqueeProps) {
  const reduceMotion = useReducedMotion();

  const group = (hidden: boolean) => (
    <div
      className="flex shrink-0 items-center"
      aria-hidden={hidden || undefined}
    >
      {items.map((term, index) => (
        <span key={index} className="flex items-center">
          <span className="px-6 font-display text-lg uppercase tracking-[0.25em] text-ink-soft sm:text-xl">
            {term}
          </span>
          <span className="text-accent" aria-hidden="true">
            ✳
          </span>
        </span>
      ))}
    </div>
  );

  return (
    <div className="relative overflow-hidden border-y border-line py-4">
      <style>{`
        @keyframes creativeMarquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
      <div
        className="flex w-max"
        style={
          reduceMotion
            ? undefined
            : { animation: "creativeMarquee 34s linear infinite" }
        }
      >
        {group(false)}
        {group(true)}
      </div>
    </div>
  );
}
