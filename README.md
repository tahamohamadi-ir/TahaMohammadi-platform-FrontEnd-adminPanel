# Taha Mohammadi Platform — Admin Panel

<!-- PRODUCT-V2.1 -->

Current execution target: research-first bilingual portfolio, independently publishable detail pages and broad CMS editing under ADR-0010. Dispatch only this repository's packets from `../../Docs/05-delivery/concept-alignment-v2/EXECUTION.md` (paths here are repository-relative). Older scaffold/phase status below is a dated baseline, not current feature acceptance. Preserve current endpoints until the additive target contract is implemented and exported.
<!-- /PRODUCT-V2.1 -->

Greenfield administration frontend for the platform CMS. This repository is independent from the public site and backend. The legacy admin UI may be inspected for workflow coverage, but its implementation must not be copied.

## Current state

- Repository governance and delivery baseline: ready.
- Runtime scaffold: Wave 0 foundation (React 19, Vite, TypeScript 5.9, router shell, env + dev proxy).
- Canonical contracts: `../../Docs/` in the local workspace.
- Execution plan: [ROADMAP.md](ROADMAP.md) and [TASK-LIST.md](TASK-LIST.md).

## Local development

Prerequisites: Node.js LTS, npm, and the backend running at `http://localhost:8000`.

```bash
cd Front-End/admin-panel
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173/admin/`. The Vite dev server proxies `/api`, `/health`, and `/media` to the backend so cookie-authenticated same-origin calls match production topology. Leave `VITE_API_BASE` empty in `.env` to use relative API paths.

Build and checks:

```bash
npm run lint
npm run test
npm run build
```

The panel must make publication state, locale completeness, validation, permissions, destructive actions, revision history, and backend errors explicit. It must never imply that a save, publish, rebuild, upload, or schedule operation succeeded without server confirmation.
