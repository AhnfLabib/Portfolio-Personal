import { useState } from "react";
import type { ComponentType, FormEvent } from "react";
import { motion } from "framer-motion";
import {
  Github,
  Instagram,
  Linkedin,
  Mail,
  Send,
} from "lucide-react";
import type { LucideProps } from "lucide-react";
import { contact, socials } from "../../data/content";

type Status = "idle" | "sending" | "success" | "error";

const ICONS: Record<string, ComponentType<LucideProps>> = {
  mail: Mail,
  linkedin: Linkedin,
  github: Github,
  instagram: Instagram,
};

export default function DevContact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    try {
      await fetch(contact.formEndpoint, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      setStatus("success");
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      setStatus("error");
    }
  }

  const inputClass =
    "w-full rounded-lg border border-line bg-surface px-4 py-3 font-mono text-sm text-ink placeholder:text-ink-faint outline-none transition-colors duration-200 focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/40";

  return (
    <section id="contact" className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28">
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="mx-auto max-w-xl text-center"
      >
        <p className="font-mono text-sm tracking-widest text-accent">
          // say hello
        </p>
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Let's build something
        </h2>
        <p className="mt-4 leading-relaxed text-ink-soft">
          Have a role, a project, or just a good idea? Drop me a line and I'll
          get back to you.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-10 flex flex-col gap-4 text-left"
        >
          <div>
            <label htmlFor="contact-name" className="sr-only">
              Name
            </label>
            <input
              id="contact-name"
              type="text"
              required
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="contact-email" className="sr-only">
              Email
            </label>
            <input
              id="contact-email"
              type="email"
              required
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="contact-message" className="sr-only">
              Message
            </label>
            <textarea
              id="contact-message"
              required
              rows={5}
              placeholder="Your message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className={`${inputClass} resize-none`}
            />
          </div>

          <div className="flex flex-col items-center gap-4">
            <button
              type="submit"
              disabled={status === "sending"}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-7 py-3 font-mono text-sm font-medium text-accent-ink transition-transform duration-200 hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              <Send size={15} />
              {status === "sending" ? "Sending…" : "Send message"}
            </button>

            <p aria-live="polite" className="min-h-[1.25rem] font-mono text-sm">
              {status === "success" && (
                <span className="text-accent">Message sent — thank you!</span>
              )}
              {status === "error" && (
                <span className="text-ink-soft">
                  Something went wrong. Please try again.
                </span>
              )}
            </p>
          </div>
        </form>

        <ul className="mt-6 flex items-center justify-center gap-3">
          {socials.map((social) => {
            const Icon = ICONS[social.icon];
            return (
              <li key={social.label}>
                <a
                  href={social.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={social.label}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-line text-ink-soft transition-colors duration-200 hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                >
                  {Icon && <Icon size={18} />}
                </a>
              </li>
            );
          })}
        </ul>
      </motion.div>
    </section>
  );
}
