---
name: awesome-design-md
description: >-
  Reference library of 84 DESIGN.md files extracted from real websites (Vercel,
  Linear, Stripe, Apple, Claude, Raycast, Supabase, Figma, Notion, Cursor and
  more). Use when the user asks to make something "look like <site>", wants a
  reference design system for a page or component, or needs concrete tokens
  (type scale, spacing, color, motion) and patterns from a well-known product
  instead of guessing. Also use to sanity-check this portfolio's own design
  choices against how comparable developer-facing sites handle the same thing.
license: MIT
metadata:
  author: VoltAgent (collection); wrapper written for this repo
  version: "1.0.0"
  upstream: https://github.com/voltagent/awesome-design-md
---

# Awesome DESIGN.md

A collection of `DESIGN.md` files, one folder per site, under `design-md/`.
Each folder has `DESIGN.md` (the design system: brand voice, color tokens,
typography, spacing, components, motion, and rules) and a `README.md` (what
was analyzed and when).

## How to use

1. Pick the site(s) that match what the user wants. Browse the folder list
   with `ls design-md/`. For this portfolio the most relevant references are
   developer-facing sites with dark and light themes: `vercel`, `linear.app`,
   `raycast`, `supabase`, `cursor`, `warp`, `resend`, `posthog`, `claude`.
2. Read that folder's `DESIGN.md` in full before proposing or writing UI.
3. Take the *principles and tokens* (hierarchy, spacing rhythm, type scale,
   motion restraint), not the brand. Never copy a site's logo, name, colors
   as a set, or copy. This portfolio has its own palette in `src/index.css`;
   adapt references to it.
4. When reviewing existing UI, cite the specific rule from the reference
   DESIGN.md that the UI follows or breaks.

## Do not

- Do not load more than two or three DESIGN.md files at once; they are long.
- Do not treat a reference as a requirement. The user's own design system
  and the `taste-skill` rules win over any reference here.
