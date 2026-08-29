# ADR — Package Manager

Status: Accepted

Date: 2026-08-29

## Context

The admin panel is a greenfield React/Vite SPA deployed independently from the backend and public site. The workspace needs one reproducible JavaScript toolchain choice before CI, lockfile policy, and contributor onboarding can stabilize.

## Decision

Use **npm** with a committed `package-lock.json` for dependency installation, scripts, and CI.

## Consequences

- Contributors run `npm ci` in CI and `npm install` locally after dependency changes.
- Alternative package managers (pnpm, yarn, bun) are out of scope unless a future ADR replaces this decision.
- Repository scripts (`dev`, `build`, `lint`, `test`) are authored for npm.
- `node_modules/` remains gitignored; only the lockfile is tracked.

## Related

- ADR-0003 (React/Vite admin SPA) — stack choice
- `Docs/02-architecture/DEPLOYMENT-TOPOLOGY.md` — same-origin delivery baseline
