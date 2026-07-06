import { about } from "../data/content";
import Section from "./Section";

export default function About() {
  const [p0, p1, p2] = about.paragraphs;
  const instagramPhrase = "my Instagram";
  const splitIdx = p2.indexOf(instagramPhrase);
  const before = p2.slice(0, splitIdx);
  const after = p2.slice(splitIdx + instagramPhrase.length);

  return (
    <Section id="about" label="Who I am" title="About Me">
      <div className="flex flex-col gap-10 md:flex-row md:items-start md:gap-14">
        {/* Portrait: raised frame → inset tray → image */}
        <div className="w-full flex-shrink-0 md:w-2/5">
          <div className="neu-raised-lg p-5">
            <div className="neu-inset p-3">
              <img
                src={about.image}
                alt="Portrait of Ahnaf Labib"
                className="aspect-[3/4] w-full rounded-2xl object-cover"
              />
            </div>
          </div>
        </div>

        {/* Paragraphs */}
        <div className="flex flex-1 flex-col justify-center gap-5">
          <p className="leading-relaxed text-ink-soft">{p0}</p>
          <p className="leading-relaxed text-ink-soft">{p1}</p>
          <p className="leading-relaxed text-ink-soft">
            {before}
            <a
              href={about.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              {instagramPhrase}
            </a>
            {after}
          </p>
        </div>
      </div>
    </Section>
  );
}
