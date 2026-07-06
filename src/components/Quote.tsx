import { Quote as QuoteIcon } from "lucide-react";
import { quote } from "../data/content";

export default function Quote() {
  return (
    <div className="flex justify-center px-6 py-16">
      <div className="neu-inset w-full max-w-3xl rounded-3xl px-10 py-12 text-center sm:px-14 sm:py-14">
        <QuoteIcon
          className="mx-auto mb-6 h-8 w-8 text-ink-faint"
          aria-hidden="true"
        />
        <p className="text-lg italic leading-relaxed text-ink-soft sm:text-xl">
          "{quote.text}"
        </p>
        <p className="mt-5 text-ink-faint">— {quote.author}</p>
      </div>
    </div>
  );
}
