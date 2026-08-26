# Company OS

An internal operating system for the company. Two parts:

- **`/brain`** — the actual source of truth: plain markdown/YAML files. See `brain/README.md` for the rules.
- **This app** — a Next.js reader/index on top of `/brain`, plus live data (issues, projects, scorecards) that doesn't belong in files.

Not a developer? Start with `docs/how-to-run.md`.

Production diagnostics and admin scripts (webhook debugging, filing or
resolving Issues against the real database) run as manual GitHub
Actions workflows — see `docs/admin-scripts.md`.
