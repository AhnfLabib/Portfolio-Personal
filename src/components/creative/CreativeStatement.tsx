import { about, creative } from "../../data/content";

export default function CreativeStatement() {
  return (
    <section id="statement" className="scroll-mt-24 px-4 py-24 sm:px-6 sm:py-32">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[160px_1fr] md:items-start">
        <img
          src={about.artistImage}
          alt="Ahnaf Labib"
          width={120}
          height={120}
          loading="lazy"
          decoding="async"
          className="h-[120px] w-[120px] rotate-[-4deg] border border-line bg-surface object-cover p-1 shadow-[0_8px_24px_rgba(0,0,0,.4)]"
        />
        <div>
          <p className="max-w-[28ch] font-display text-[1.85rem] italic sm:text-[2.75rem] leading-[1.15] text-ink">
            {creative.statement}
          </p>
          <p className="mt-6 font-mono text-xs uppercase tracking-wide text-ink-faint">
            now · {creative.now}
          </p>
          <ul className="mt-6 flex flex-wrap gap-2" aria-label="Tags">
            {creative.tags.map((tag) => (
              <li
                key={tag}
                className="inline-flex rounded-full border border-line px-3 py-1 font-mono text-[11px] uppercase tracking-wide text-ink-soft"
              >
                {tag}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
