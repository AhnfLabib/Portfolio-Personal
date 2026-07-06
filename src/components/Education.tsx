import { education } from "../data/content";
import Section from "./Section";

export default function Education() {
  return (
    <Section id="education" label="Where I study" title="Education">
      <div className="neu-raised-lg p-8 sm:p-12">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-10">
          {/* Logo medallion */}
          <div className="flex-shrink-0">
            <div className="neu-raised-sm rounded-full p-4">
              <img
                src={education.logo}
                alt={`${education.school} logo`}
                className="h-20 w-20 rounded-full object-contain"
              />
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-1 flex-col gap-3 text-center sm:text-left">
            <div>
              <a
                href={education.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xl font-bold text-ink transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                {education.school}
              </a>
              <p className="mt-0.5 text-ink-faint">{education.location}</p>
            </div>

            <p className="font-semibold text-ink">{education.degree}</p>

            <div className="flex justify-center sm:justify-start">
              <span className="neu-inset-sm rounded-full px-4 py-1.5 text-sm text-ink-soft">
                {education.minor}
              </span>
            </div>

            <p className="leading-relaxed text-ink-soft">{education.description}</p>
          </div>
        </div>
      </div>
    </Section>
  );
}
