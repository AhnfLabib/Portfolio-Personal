# Ahnaf Labib — Portfolio

Personal portfolio website with a neumorphic ("Soft UI"), minimalistic design. Every element sits on a single soft-gray surface — depth comes exclusively from dual light/dark shadows, with raised cards, carved-in inputs, and tactile press-in interactions.

## Tech stack

- [Vite](https://vite.dev/) + [React 19](https://react.dev/) + TypeScript (strict)
- [Tailwind CSS v4](https://tailwindcss.com/) — design tokens defined as CSS variables in `src/index.css`
- [Framer Motion](https://motion.dev/) — subtle scroll reveals and hover lifts
- [lucide-react](https://lucide.dev/) — icons

## Development

```bash
npm install
npm run dev      # start dev server
npm run build    # typecheck + production build (outputs to dist/)
npm run preview  # preview the production build
```

## Structure

- `src/index.css` — neumorphic design system: surface color, shadow tokens, and the `.neu-raised` / `.neu-inset` / `.neu-btn` utility classes
- `src/data/content.ts` — all site content (bio, experience, projects, links) in one typed module
- `src/components/` — one component per section; `Section.tsx` is the shared wrapper (layout + scroll reveal), `Timeline.tsx` renders the grooved experience/leadership timelines
- `public/assets/` — images and logos
