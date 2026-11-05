# Project skills

Skills in this folder are loaded automatically by Claude Code (and other
agents that read `.claude/skills/`) for anyone working in this repo. They are
vendored copies, not submodules, so a fresh clone has everything.

| Skill | Upstream | Path in upstream | Commit vendored | Vendored on |
|---|---|---|---|---|
| `awesome-design-md` | https://github.com/voltagent/awesome-design-md | `design-md/` (the `SKILL.md` wrapper was written in this repo) | `fcc7028` | 2026-11-05 |
| `composition-patterns` | https://github.com/vercel-labs/agent-skills | `skills/composition-patterns` | `1a2c79d` | 2026-11-05 |
| `react-best-practices` | https://github.com/vercel-labs/agent-skills | `skills/react-best-practices` | `1a2c79d` | 2026-11-05 |
| `taste-skill` | https://github.com/leonxlnx/taste-skill | `skills/taste-skill` | `9b4bf93` | 2026-11-05 |
| `web-design-guidelines` | https://github.com/vercel-labs/agent-skills | `skills/web-design-guidelines` | `1a2c79d` | 2026-11-05 |

All five are MIT licensed; each folder carries its upstream `LICENSE`.

## When each one applies

- **taste-skill** (`design-taste-frontend`): any time a page or section is
  built, restyled, polished or reviewed. The anti-generic rule set and the
  browser checker. Load it before frontend work.
- **web-design-guidelines**: reviewing UI code for accessibility and web
  interface guideline compliance ("review my UI", "check a11y").
- **react-best-practices**: writing or refactoring React components;
  performance rules.
- **composition-patterns**: component API design, compound components,
  avoiding boolean-prop sprawl.
- **awesome-design-md**: reference design systems from real sites, for
  "make it feel like X" requests or to sanity-check design choices.

## Updating

Re-clone the upstream repo, copy the folder over the one here, and update the
commit column above. `taste-skill` ships ~40 MB of assets (photos, icons,
scenes) that its SKILL.md depends on; keep them.
