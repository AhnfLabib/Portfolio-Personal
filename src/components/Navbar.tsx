import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { nav } from "../data/content";

const ALL_IDS = ["home", ...nav.map((item) => item.href.slice(1))];

export default function Navbar() {
  const [activeSection, setActiveSection] = useState("home");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const els = ALL_IDS.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => el !== null
    );

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-10% 0px -85% 0px", threshold: 0 }
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <header className="fixed top-4 inset-x-0 z-50 px-4">
      <div className="relative mx-auto max-w-3xl">
        {/* Floating pill */}
        <div className="neu-raised rounded-full flex items-center justify-between gap-4 px-6 py-3">
          {/* Logo */}
          <a
            href="#home"
            className="font-extrabold text-lg text-ink shrink-0 transition-colors duration-200 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
          >
            Ahnaf Labib<span className="text-accent">.</span>
          </a>

          {/* Desktop nav */}
          <nav
            className="hidden md:flex items-center gap-1"
            aria-label="Main navigation"
          >
            {nav.map((item) => {
              const id = item.href.slice(1);
              const isActive = activeSection === id;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-accent ${
                    isActive
                      ? "neu-inset-sm rounded-full text-accent"
                      : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            className="md:hidden neu-btn w-10 h-10 flex items-center justify-center text-ink-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Mobile dropdown panel */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="absolute top-full mt-2 left-0 right-0 neu-raised-lg p-4 flex flex-col gap-1 md:hidden"
              aria-label="Mobile navigation"
            >
              {nav.map((item) => {
                const id = item.href.slice(1);
                const isActive = activeSection === id;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`px-4 py-3 text-sm font-medium rounded-full transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-accent ${
                      isActive
                        ? "neu-inset-sm rounded-full text-accent"
                        : "text-ink-soft hover:text-ink"
                    }`}
                  >
                    {item.label}
                  </a>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
