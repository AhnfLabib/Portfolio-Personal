import type { CSSProperties } from "react";
import { creative } from "../../data/content";
import { frameSrcSet } from "./frameSrc";

/**
 * Wall slots, in content order (creative.hero.wall):
 *   0 large frame   — left half, under the name strip
 *   1 tall portrait — middle column, full height
 *   2, 3 landscapes — right column, stacked
 *   4 small portrait — right column, bottom
 * Below lg (phones and portrait tablets): the large frame spans both columns,
 * the other four sit 2×2.
 * `sizes` describes the width the browser must fetch for object-cover. Slots 2
 * and 3 hold 16:9 photos in portrait-shaped cells, so the fetch width follows
 * cell height × 1.78: below lg a ~50vw × 66.7vw cell needs ~118vw (120vw, so a
 * DPR2 phone picks the 1600w file); at lg+ a ~240px-tall cell needs ~425px
 * (30vw ≈ 432 at 1440).
 * `focus` keeps each photo's subject in the crop.
 * `lazy` marks the two frames below the phone fold.
 */
const SLOTS: { cell: string; sizes: string; focus: string; lazy?: boolean }[] = [
  { cell: "aspect-square sm:aspect-[4/3] lg:aspect-auto lg:min-h-0 lg:flex-1", sizes: "", focus: "55% 50%" },
  { cell: "aspect-[3/4] lg:aspect-auto lg:col-start-2 lg:row-span-3 lg:row-start-1", sizes: "(min-width: 1024px) 30vw, 50vw", focus: "50% 50%" },
  { cell: "aspect-[3/4] lg:aspect-auto lg:col-start-3 lg:row-start-1", sizes: "(min-width: 1024px) 30vw, 120vw", focus: "55% 50%" },
  { cell: "aspect-[3/4] lg:aspect-auto lg:col-start-3 lg:row-start-2", sizes: "(min-width: 1024px) 30vw, 120vw", focus: "72% 50%", lazy: true },
  { cell: "aspect-[3/4] lg:aspect-auto lg:col-start-3 lg:row-start-3", sizes: "(min-width: 1024px) 20vw, 50vw", focus: "50% 30%", lazy: true },
];

const STAGGER_MS = 60;

export default function CreativeHero() {
  const { wall, line, cta } = creative.hero;
  if (wall.length !== SLOTS.length) throw new Error(`hero wall needs ${SLOTS.length} frames`);

  const frame = (i: number) => {
    const f = wall[i];
    const large = i === 0;
    const style: CSSProperties = { animationDelay: `${i * STAGGER_MS}ms` };
    return (
      <div
        key={f.src}
        data-frame
        style={style}
        className={`overflow-hidden bg-surface animate-settle motion-reduce:animate-none ${SLOTS[i].cell}`}
      >
        <img
          src={f.src}
          srcSet={large ? undefined : frameSrcSet(f)}
          sizes={large ? undefined : SLOTS[i].sizes}
          alt={f.alt}
          width={f.width}
          height={f.height}
          fetchPriority={large ? "high" : undefined}
          loading={SLOTS[i].lazy ? "lazy" : undefined}
          decoding="async"
          style={{ objectPosition: SLOTS[i].focus }}
          className="h-full w-full object-cover"
        />
      </div>
    );
  };

  return (
    <section
      id="top"
      className="px-4 pb-6 pt-3 sm:px-6 lg:h-[calc(100svh-4rem)] lg:overflow-hidden"
    >
      <div className="relative mx-auto grid h-full max-w-6xl grid-cols-2 gap-3 lg:grid-cols-[minmax(0,50fr)_minmax(0,30fr)_minmax(0,19fr)] lg:grid-rows-[1fr_1fr_1.25fr]">
        {/* Name strip (one line on lg+; at 7rem it runs a little past the large
            frame onto the tall portrait, frosted, as in the mock), then the large
            frame it overlaps by 2rem. */}
        <div className="col-span-2 flex flex-col lg:col-span-1 lg:row-span-3 lg:min-h-0">
          <div className="relative z-10 self-start bg-bg/85 pb-5 pr-6 pt-2 backdrop-blur-md lg:pt-0">
            <h1 className="font-display text-[3.5rem] leading-[0.92] tracking-[-0.03em] text-ink sm:text-[4.5rem] lg:whitespace-nowrap lg:text-[5.5rem] xl:text-[7rem]">
              Ahnaf Labib
            </h1>
            <p className="mt-3 font-mono text-xs uppercase tracking-wide text-ink-soft">{line}</p>
          </div>
          <div className="mt-3 flex min-h-0 flex-col lg:-mt-8 lg:flex-1">{frame(0)}</div>
        </div>
        {frame(1)}
        {frame(2)}
        {frame(3)}
        {frame(4)}
        <a
          href="#rolls"
          className="col-span-2 justify-self-end py-2 font-mono text-xs uppercase tracking-wide text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent lg:absolute lg:bottom-0 lg:right-0 lg:z-10 lg:bg-bg/75 lg:pb-0 lg:pl-4 lg:pt-3 lg:backdrop-blur-md"
        >
          {cta} <span aria-hidden="true" className="text-accent">↓</span>
        </a>
      </div>
    </section>
  );
}
