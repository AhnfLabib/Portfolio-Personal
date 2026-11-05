import { about, creative, type Frame } from "../../data/content";
import { frameLabel } from "./rollLayout";

function srcFor800(src: string): string {
  return src.replace(/\.jpg$/, "-800.jpg");
}

/** The -800 files are resized on the long edge, so portraits are narrower than 800. */
function widthFor800(frame: Frame): number {
  return Math.round(800 * Math.min(1, frame.width / frame.height));
}

export default function CreativeRolls({
  onOpen,
}: {
  onOpen: (rollIndex: number, frameIndex: number) => void;
}) {
  return (
    <section id="rolls" className="scroll-mt-24 px-4 py-24 sm:px-6 sm:py-32">
      <div className="mx-auto max-w-6xl">
        {creative.rolls.map((roll, ri) => (
          <article key={roll.id} className={ri === 0 ? undefined : "mt-16"}>
            <p className="font-mono text-xs uppercase tracking-wide text-ink-faint">R{ri + 1}</p>
            <h2 className="font-display text-[2rem] leading-tight text-ink">{roll.title}</h2>
            <hr className="my-6 border-line" />
            <div className="columns-1 gap-3 sm:columns-2 lg:columns-3">
              {roll.frames.map((frame, fi) => (
                  <button
                    key={frame.src}
                    type="button"
                    className="group relative mb-3 block w-full cursor-zoom-in break-inside-avoid overflow-hidden p-0 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    style={{ aspectRatio: `${frame.width} / ${frame.height}` }}
                    aria-label={frame.alt}
                    onClick={() => onOpen(ri, fi)}
                  >
                    <img
                      src={frame.src}
                      srcSet={`${srcFor800(frame.src)} ${widthFor800(frame)}w, ${frame.src} ${frame.width}w`}
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
                      className="pointer-events-none absolute left-2 top-2 font-mono text-xs uppercase tracking-wide text-white opacity-0 [text-shadow:0_1px_2px_rgba(0,0,0,.8)] transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                    >
                      {frameLabel(ri, fi)}
                    </span>
                  </button>
              ))}
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
