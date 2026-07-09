import { motion } from "framer-motion";
import { Code2, Palette } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { usePersona } from "../persona/PersonaContext";
import type { Persona } from "../persona/PersonaContext";

interface Option {
  value: Persona;
  label: string;
  icon: LucideIcon;
}

const OPTIONS: Option[] = [
  { value: "dev", label: "Dev", icon: Code2 },
  { value: "creative", label: "Artist", icon: Palette },
];

interface PersonaToggleProps {
  /** compact is used in the navbar; default is roomier for standalone use. */
  size?: "compact" | "default";
  className?: string;
}

export default function PersonaToggle({
  size = "default",
  className,
}: PersonaToggleProps) {
  const { persona, setPersona } = usePersona();

  const compact = size === "compact";
  const pad = compact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";
  const iconSize = compact ? 14 : 16;

  return (
    <div
      role="group"
      aria-label="Switch portfolio persona"
      className={`relative inline-flex items-center gap-1 rounded-full border border-line bg-surface/70 p-1 backdrop-blur ${
        className ?? ""
      }`}
    >
      {OPTIONS.map((option) => {
        const isActive = persona === option.value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setPersona(option.value)}
            aria-pressed={isActive}
            aria-label={`${option.label} persona`}
            className={`relative z-10 inline-flex items-center gap-1.5 rounded-full font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${pad} ${
              isActive ? "text-accent-ink" : "text-ink-soft hover:text-ink"
            }`}
          >
            {isActive && (
              <motion.span
                layoutId="persona-pill"
                aria-hidden="true"
                className="absolute inset-0 -z-10 rounded-full bg-accent"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <Icon size={iconSize} aria-hidden="true" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
