import { about, creative } from "../../data/content";

export default function CreativeStatement() {
  return (
    <section id="statement" className="scroll-mt-24 px-4 py-24 sm:px-6 sm:py-32">
      <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[6rem_1fr] md:items-start">
        <img
          src={about.artistImage}
          alt="Ahnaf Labib"
          width={96}
          height={96}
          loading="lazy"
          decoding="async"
          className="h-24 w-24 object-cover"
        />
        <div>
          <p className="max-w-prose text-lg leading-relaxed text-ink">{creative.statement}</p>
          <p className="mt-6 font-mono text-xs uppercase tracking-wide text-ink-faint">
            now · {creative.now}
          </p>
        </div>
      </div>
    </section>
  );
}
