import { useEffect, useState } from "react";
import { about, creative } from "../../data/content";
import { columnsFor, frameLabel, spanFor, type Columns } from "./rollLayout";

const SM = "(min-width: 640px)";
const LG = "(min-width: 1024px)";

function readColumns(): Columns {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return 3;
  if (window.matchMedia(LG).matches) return columnsFor(1024);
  if (window.matchMedia(SM).matches) return columnsFor(640);
  return columnsFor(0);
}

/** Current grid column count, tracked with matchMedia (3 when unavailable). */
function useColumns(): Columns {
  const [columns, setColumns] = useState<Columns>(readColumns);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const queries = [window.matchMedia(SM), window.matchMedia(LG)];
    const update = () => setColumns(readColumns());
    queries.forEach((q) => q.addEventListener("change", update));
    update();
    return () => queries.forEach((q) => q.removeEventListener("change", update));
  }, []);
  return columns;
}

function srcFor800(src: string): string {
  return src.replace(/\.jpg$/, "-800.jpg");
}

export default function CreativeRolls({
  onOpen,
}: {
  onOpen: (rollIndex: number, frameIndex: number) => void;
}) {
  const columns = useColumns();

  return (
    <section id="rolls" className="scroll-mt-24 px-4 py-24 sm:px-6 sm:py-32">
      <div className="mx-auto max-w-6xl">
        {creative.rolls.map((roll, ri) => (
          <article key={roll.id} className={ri === 0 ? undefined : "mt-16"}>
            <p className="font-mono text-xs uppercase tracking-wide text-ink-faint">R{ri + 1}</p>
            <h2 className="font-display text-[2rem] leading-tight text-ink">{roll.title}</h2>
            <hr className="my-6 border-line" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 [grid-auto-flow:dense]">
              {roll.frames.map((frame, fi) => {
                const { col, row } = spanFor(frame, fi, columns);
                return (
                  <button
                    key={frame.src}
                    type="button"
                    className="group relative block w-full overflow-hidden p-0 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    style={{
                      gridColumn: `span ${col}`,
                      gridRow: `span ${row}`,
                      aspectRatio: `${frame.width} / ${frame.height}`,
                    }}
                    aria-label={frame.alt}
                    onClick={() => onOpen(ri, fi)}
                  >
                    <img
                      src={frame.src}
                      srcSet={`${srcFor800(frame.src)} 800w, ${frame.src} ${frame.width}w`}
                      sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                      alt={frame.alt}
                      width={frame.width}
                      height={frame.height}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute left-2 top-2 font-mono text-xs uppercase tracking-wide text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                    >
                      {frameLabel(ri, fi)}
                    </span>
                  </button>
                );
              })}
            </div>
          </article>
        ))}
        <p className="mt-12 font-mono text-xs uppercase tracking-wide">
          <a
            href={about.instagram}
            target="_blank"
            rel="noreferrer"
            className="text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            More on Instagram → @itsded_inside
          </a>
        </p>
      </div>
    </section>
  );
}
