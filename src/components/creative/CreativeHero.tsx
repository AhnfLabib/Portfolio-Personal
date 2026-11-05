import { creative } from "../../data/content";

export default function CreativeHero() {
  const { image, line, cta } = creative.hero;

  return (
    <section id="top" className="relative h-[calc(100svh-4rem)] overflow-hidden">
      <img
        src={image.src}
        alt={image.alt}
        width={image.width}
        height={image.height}
        fetchPriority="high"
        decoding="async"
        className="h-full w-full object-cover"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/60 to-transparent"
      />
      <div className="absolute inset-x-0 bottom-0">
        <div className="mx-auto flex max-w-6xl items-end justify-between gap-6 px-4 pb-8 sm:px-6">
          <div>
            <h1 className="font-display text-2xl text-white">Ahnaf Labib</h1>
            <p className="mt-1 text-white/90">{line}</p>
          </div>
          <a
            href="#rolls"
            className="shrink-0 py-2 font-mono text-xs uppercase tracking-wide text-white underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            {cta} <span aria-hidden="true">↓</span>
          </a>
        </div>
      </div>
    </section>
  );
}
