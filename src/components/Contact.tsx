import { useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import Section from "./Section";
import { contact } from "../data/content";

type Status = "idle" | "sending" | "success" | "error";

export default function Contact() {
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

  return (
    <Section id="contact" label="Get in touch" title="Contact Me">
      <form
        onSubmit={handleSubmit}
        className="max-w-xl mx-auto flex flex-col gap-4"
      >
        <label htmlFor="contact-name" className="sr-only">
          Name
        </label>
        <input
          id="contact-name"
          type="text"
          required
          placeholder="Your Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="neu-inset rounded-full bg-transparent w-full px-6 py-4 text-ink placeholder:text-ink-faint outline-none focus-visible:outline-2 focus-visible:outline-accent"
        />

        <label htmlFor="contact-email" className="sr-only">
          Email
        </label>
        <input
          id="contact-email"
          type="email"
          required
          placeholder="Your Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="neu-inset rounded-full bg-transparent w-full px-6 py-4 text-ink placeholder:text-ink-faint outline-none focus-visible:outline-2 focus-visible:outline-accent"
        />

        <label htmlFor="contact-message" className="sr-only">
          Message
        </label>
        <textarea
          id="contact-message"
          required
          rows={5}
          placeholder="Your Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="neu-inset rounded-2xl bg-transparent w-full px-6 py-4 text-ink placeholder:text-ink-faint outline-none focus-visible:outline-2 focus-visible:outline-accent resize-none"
        />

        <div className="flex flex-col items-center gap-3 mt-2">
          <button
            type="submit"
            disabled={status === "sending"}
            className="neu-btn inline-flex items-center gap-2 px-8 py-4 font-semibold text-ink hover:text-accent disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Send size={16} />
            {status === "sending" ? "Sending…" : "Send Message"}
          </button>

          {status === "success" && (
            <p className="neu-inset-sm rounded-full px-5 py-2 text-sm text-ink-soft">
              Message sent successfully!
            </p>
          )}
          {status === "error" && (
            <p className="neu-inset-sm rounded-full px-5 py-2 text-sm text-ink-soft">
              Something went wrong. Please try again.
            </p>
          )}
        </div>
      </form>
    </Section>
  );
}
