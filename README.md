# Ahnaf Labib — Portfolio

A dual-persona portfolio. One toggle switches the entire site between two versions of the same person:

- **Dev** ("The Engineer") — dark, precise, terminal/IDE-inspired. JetBrains Mono details, lime accent, grid-backed hero with a live typing prompt and a faux terminal card.
- **Artist** ("The Creative") — warm editorial print. Fraunces serif headlines, burnt-orange accent on paper, a slow marquee, an artist statement, and a masonry gallery.

The choice persists in `localStorage` and is applied pre-hydration (inline script in `index.html`) so there is no theme flash on reload.

## Tech stack

- [Vite](https://vite.dev/) + [React 19](https://react.dev/) + TypeScript (strict)
- [Tailwind CSS v4](https://tailwindcss.com/) — semantic design tokens (`bg`, `surface`, `ink`, `accent`, …) defined in `@theme` in `src/index.css`; the creative persona overrides the same custom properties via `html[data-persona="creative"]`, re-theming every utility at once
- [Framer Motion](https://motion.dev/) — persona cross-fade, sliding toggle indicator, scroll reveals
- [lucide-react](https://lucide.dev/) — icons

## Development

```bash
npm install
npm run dev      # start dev server
npm run build    # typecheck + production build (outputs to dist/)
npm run preview  # preview the production build
```

## Structure

- `src/persona/PersonaContext.tsx` — the `dev | creative` persona state: context, `usePersona()`, localStorage persistence, and the `data-persona` attribute that drives theming
- `src/components/PersonaToggle.tsx` — the Dev ⇄ Artist segmented toggle (navbar)
- `src/components/{Navbar,Section,Footer}.tsx` — shared, persona-aware chrome
- `src/components/dev/` — the engineer portfolio (hero, about, experience, projects, education, leadership, contact form)
- `src/components/creative/` — the artist portfolio (hero, statement, crafts, gallery, quote, contact)
- `src/data/content.ts` — all site content in one typed module
- `src/index.css` — the dual-persona token system and global styles

## Gallery images

The creative gallery currently renders abstract gradient-and-grain tiles from each item's `palette`. To show real photographs, drop images into `public/assets/gallery/` and set the `image` field on the corresponding item in `creative.gallery` in `src/data/content.ts` — the tile upgrades to the photo automatically.
