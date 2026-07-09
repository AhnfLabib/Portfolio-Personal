import { usePersona } from "../persona/PersonaContext";

export default function Footer() {
  const { persona } = usePersona();

  if (persona === "dev") {
    return (
      <footer className="border-t border-line bg-surface/50">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 font-mono text-xs text-ink-faint sm:px-6">
          <span className="text-accent">-- INSERT --</span>
          <span>ahnaf@portfolio</span>
          <span aria-hidden="true">·</span>
          <span>built with react + vite</span>
          <span aria-hidden="true">·</span>
          <span>© 2026</span>
        </div>
      </footer>
    );
  }

  return (
    <footer className="border-t border-line px-4 py-14 text-center sm:px-6">
      <p className="font-display text-lg italic text-ink-soft">
        Made with intention.
      </p>
      <p className="mt-1 text-sm text-ink-faint">© 2026 Ahnaf Labib</p>
    </footer>
  );
}
