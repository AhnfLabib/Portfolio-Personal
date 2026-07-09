import { motion } from "framer-motion";
import { Github, Instagram, Linkedin, Mail } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { socials } from "../../data/content";
import { usePersona } from "../../persona/PersonaContext";

const socialIcons: Record<string, LucideIcon> = {
  mail: Mail,
  linkedin: Linkedin,
  github: Github,
  instagram: Instagram,
};

export default function CreativeContact() {
  const { setPersona } = usePersona();
  const mail = socials.find((social) => social.icon === "mail");

  return (
    <section
      id="contact"
      className="scroll-mt-24 px-4 py-24 text-center sm:px-6 sm:py-32"
    >
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto max-w-3xl"
      >
        <p className="mb-6 flex items-center justify-center gap-4 text-xs font-semibold uppercase tracking-[0.35em] text-ink-soft">
          <span className="h-px w-10 bg-accent" aria-hidden="true" />
          <span>Contact</span>
        </p>

        <h2
          className="font-display font-semibold leading-[0.95] tracking-tight text-ink"
          style={{ fontSize: "clamp(2.5rem, 8vw, 5rem)" }}
        >
          Let&rsquo;s make <span className="italic text-accent">something</span>.
        </h2>

        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
          A print, a portrait, a song, or a website — if there&rsquo;s some soul
          in it, I&rsquo;m in. Say hello and let&rsquo;s trade ideas.
        </p>

        {mail && (
          <a
            href={`https://mail.google.com/mail/?view=cm&fs=1&to=${mail.href.replace(
              /^mailto:/,
              ""
            )}`}
            target="_blank"
            rel="noreferrer"
            className="mt-10 inline-flex items-center gap-3 rounded-full bg-accent px-8 py-4 font-medium text-accent-ink transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-bg"
          >
            <Mail className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            Say hello
          </a>
        )}

        <ul className="mt-12 flex items-center justify-center gap-3">
          {socials.map((social) => {
            const Icon = socialIcons[social.icon];
            return (
              <li key={social.label}>
                <a
                  href={social.href}
                  target={social.href.startsWith("http") ? "_blank" : undefined}
                  rel={
                    social.href.startsWith("http") ? "noreferrer" : undefined
                  }
                  aria-label={social.label}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-line text-ink-soft transition-colors duration-200 hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                >
                  <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                </a>
              </li>
            );
          })}
        </ul>

        <div className="mt-16 border-t border-line pt-8">
          <button
            type="button"
            onClick={() => setPersona("dev")}
            className="group inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-ink-faint transition-colors duration-200 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-bg"
          >
            for work inquiries → the dev side
            <span
              aria-hidden="true"
              className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
            >
              ↗
            </span>
          </button>
        </div>
      </motion.div>
    </section>
  );
}
