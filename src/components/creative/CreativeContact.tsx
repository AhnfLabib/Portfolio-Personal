import { Fragment } from "react";
import { creative, socials } from "../../data/content";
import { usePersona } from "../../persona/PersonaContext";

/** The order the links read in: email · instagram · linkedin · github. */
const linkOrder = ["mail", "instagram", "linkedin", "github"] as const;
const contactLinks = linkOrder.flatMap((icon) => socials.filter((social) => social.icon === icon));

export default function CreativeContact() {
  const { setPersona } = usePersona();

  return (
    <section id="contact" className="scroll-mt-24 px-4 py-24 sm:px-6 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <h2 className="font-display text-[3.25rem] leading-none tracking-tight text-ink sm:text-[5rem]">
          {creative.contact.headline}
        </h2>

        <p className="mt-10 flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs uppercase tracking-wide">
          {contactLinks.map((social, i) => {
            const external = social.href.startsWith("http");
            return (
              <Fragment key={social.label}>
                {i > 0 && (
                  <span aria-hidden="true" className="text-ink-faint">
                    ·
                  </span>
                )}
                <a
                  href={social.href}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noreferrer" : undefined}
                  className="text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
                >
                  {social.icon === "mail" ? "email" : social.label.toLowerCase()}
                </a>
              </Fragment>
            );
          })}
        </p>

        <p className="mt-6 font-mono text-xs uppercase tracking-wide text-ink-faint">
          <button
            type="button"
            onClick={() => setPersona("dev")}
            className="group inline-flex items-center gap-2 uppercase tracking-wide transition-colors duration-200 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            for work inquiries → the dev side
            <span
              aria-hidden="true"
              className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 motion-reduce:transition-none"
            >
              ↗
            </span>
          </button>
        </p>
      </div>
    </section>
  );
}
