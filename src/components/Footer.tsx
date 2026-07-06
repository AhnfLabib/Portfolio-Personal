import { Mail, Linkedin, Github, Instagram, type LucideIcon } from "lucide-react";
import { socials } from "../data/content";

type SocialIconName = (typeof socials)[number]["icon"];

const iconMap: Record<SocialIconName, LucideIcon> = {
  mail: Mail,
  linkedin: Linkedin,
  github: Github,
  instagram: Instagram,
};

export default function Footer() {
  return (
    <footer className="py-16 px-6 flex flex-col items-center gap-6">
      {/* Social icon buttons */}
      <div className="flex items-center gap-4 flex-wrap justify-center">
        {socials.map((social) => {
          const Icon = iconMap[social.icon];
          return (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={social.label}
              className="neu-btn w-12 h-12 flex items-center justify-center text-ink-soft hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
            >
              <Icon size={20} />
            </a>
          );
        })}
      </div>

      {/* Copyright */}
      <p className="text-sm text-ink-faint">
        © 2026 Ahnaf Labib. All rights reserved.
      </p>
    </footer>
  );
}
