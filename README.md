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

## Terminal and `ask`

The terminal card in the Dev hero is interactive: click it (or Tab to it) and type. Tab completes, ↑/↓ walk history, Ctrl+L clears, Esc leaves. Two pixel companions (Ahnaf and a cat) react to what you do. Commands:

- `help` — list commands
- `whoami` — who is this
- `experience` — where I've worked
- `projects` — things I've built
- `skills` — my stack
- `education` — where I studied
- `leadership` — clubs and roles
- `contact` — get in touch
- `socials` — find me online
- `resume` — open the resume
- `ask <question>` — ask Ahnaf a question (answered by Gemini)
- `skin [name]` — change the companions' look (`default`, `hacker`, `artist`, `shades`)
- `pet` — pet the cat
- `clear` — clear the screen
- `ls` — list files
- `sudo` — try it

`ask` is served by the Vercel function in `api/ask.ts`, which calls Google Gemini. The model is the `MODEL` constant at the top of that file. Setup:

- Set `GEMINI_API_KEY` in Vercel → Project → Settings → Environment Variables, for both **Production** and **Preview**, then redeploy.
- Caps: 10 questions per day per visitor (counted in the browser), 20 per hour per IP (in the function), and 300 characters per question.
- Local dev: copy `.env.example` to `.env.local`, fill in the key, and run `vercel dev`, which serves the site and `/api` together. `.env.local` is git-ignored; `.env.example` is the template. Plain `npm run dev` does not serve `/api`, so `ask` is offline there.
- Without the key the site works as usual; `ask` just prints `ask is offline right now — try 'help'`.

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
