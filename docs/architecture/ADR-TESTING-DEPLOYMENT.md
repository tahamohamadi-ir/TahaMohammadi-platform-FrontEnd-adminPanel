# ADR — Testing and Deployment

Status: Accepted

Date: 2026-08-31

## Context

The admin SPA deploys independently at base path `/admin/` behind the same-origin reverse proxy documented in `Docs/02-architecture/DEPLOYMENT-TOPOLOGY.md`.

## Decision

**Unit and component tests:** Vitest 3 + Testing Library + jsdom (current CI).

**Integration tests:** mock `fetch` / `adminFetch` with deterministic responses; TanStack Query uses `retry: false` in test `QueryClient`.

**Browser / E2E (ADMIN-290):** Playwright against disposable backend + seeded fixtures per `docs/operations/LOCAL-E2E.md`. Matrix: signed-out redirect, MFA challenge, forbidden route, validation errors, stale revision.

**Deployment:**

- Vite `base: '/admin/'`.
- Dev proxy: `/api`, `/health`, `/media` → `localhost:8000`.
- Production: static assets served separately; API same-origin via reverse proxy.
- No secrets in the client bundle; `VITE_*` only for non-secret config.

## Consequences

- CI runs `npm run lint`, `npm test`, `npm run build` on `main`.
- Playwright added in a later task when ADMIN-290 starts.

## Related

- `vite.config.ts`, `.github/workflows/ci.yml`
- ADR-PACKAGE-MANAGER (npm)
