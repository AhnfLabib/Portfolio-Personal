import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

export type Persona = "dev" | "creative";

const STORAGE_KEY = "portfolio-persona";

interface PersonaContextValue {
  persona: Persona;
  setPersona: (next: Persona) => void;
  toggle: () => void;
}

const PersonaContext = createContext<PersonaContextValue | null>(null);

function readInitialPersona(): Persona {
  if (typeof window === "undefined") return "dev";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "creative" ? "creative" : "dev";
}

export function PersonaProvider({ children }: { children: ReactNode }) {
  const [persona, setPersonaState] = useState<Persona>(readInitialPersona);

  // Keep <html data-persona> and localStorage in sync with state. This drives
  // the entire semantic-token theme via the CSS attribute selector.
  useEffect(() => {
    document.documentElement.dataset.persona = persona;
    try {
      window.localStorage.setItem(STORAGE_KEY, persona);
    } catch {
      /* storage may be unavailable (private mode); theme still works in-memory */
    }
  }, [persona]);

  const setPersona = useCallback((next: Persona) => {
    setPersonaState(next);
  }, []);

  const toggle = useCallback(() => {
    setPersonaState((prev) => (prev === "dev" ? "creative" : "dev"));
  }, []);

  const value = useMemo<PersonaContextValue>(
    () => ({ persona, setPersona, toggle }),
    [persona, setPersona, toggle],
  );

  return (
    <PersonaContext.Provider value={value}>{children}</PersonaContext.Provider>
  );
}

export function usePersona(): PersonaContextValue {
  const ctx = useContext(PersonaContext);
  if (!ctx) {
    throw new Error("usePersona must be used within a PersonaProvider");
  }
  return ctx;
}
