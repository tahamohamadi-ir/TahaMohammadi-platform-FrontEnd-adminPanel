# Admin Panel Task List

Detailed execution queue. Cross-repo board: `../../Docs/05-delivery/MULTI-AGENT-TASK-BOARD.md` (IDs prefixed `ADMIN-`).

Status: `[x]` done, `[ ]` open, `[~]` in progress.

---

## ADM-0 — Scaffold and toolchain

- [x] **ADMIN-010** Init React 19 + Vite + TypeScript 5.9; lockfile; `npm run build` green.
- [x] **ADMIN-011** ESLint + Prettier + Vitest baseline.
- [x] **ADMIN-012** GitHub Actions: install, typecheck, unit tests, build.
- [ ] **ADMIN-013** ADRs: auth, state, editor, testing, deployment.

## ADM-1 — Auth and API client

- [x] PS-05 admin OpenAPI accepted; type generation unblocked.
- [x] **ADMIN-030** Env schema (`VITE_API_BASE`, proxy assumptions).
- [x] **ADMIN-040** Same-origin dev proxy documented and working.
- [x] **ADMIN-050** Generate admin types from accepted OpenAPI hash.
- [~] **ADMIN-060** API client with CSRF hooks and cookie credentials.
- [ ] **ADMIN-070** Error normalizer (`code/message/fields`, network, 403, 409).
- [ ] **ADMIN-080** Sign-in flow.
- [ ] **ADMIN-090** MFA / OTP challenge.
- [ ] **ADMIN-100** Sign-out, session expiry, re-authentication.
- [ ] **ADMIN-110** CSRF on all mutations; regression test without token.

## ADM-2 — Design system and shell

- [ ] **ADMIN-120** Admin tokens + table, form, dialog, notice, upload primitives.
- [ ] **ADMIN-130** Permission-aware nav; forbidden/unauthorized states.
- [ ] **ADMIN-131** RTL text entry and long-content layout checks.

## ADM-3 — Core workflows

- [ ] **ADMIN-140** Dashboard + backend health/degraded status.
- [ ] **ADMIN-150** Profile + site settings.
- [ ] **ADMIN-160** Articles/series CRUD, filters, pagination.
- [ ] **ADMIN-170** Research, publications, projects collections.
- [ ] **ADMIN-171** Books, talks, downloads, courses, creative work.
- [ ] **ADMIN-180** Media library: upload, metadata, usage, delete protection.
- [ ] **ADMIN-190** Home module composition and ordering.
- [ ] **ADMIN-200** Timeline editor + validation.
- [ ] **ADMIN-210** Graph editor (nodes, edges, groups) per reference boundary.
- [ ] **ADMIN-220** Preview-share tokens.
- [ ] **ADMIN-230** Revision history + restore + conflict UI.
- [ ] **ADMIN-240** Schedule, publish, archive, bulk actions.

## ADM-4 — Seed supplement and approval queue

- [ ] **ADMIN-260** Surface `admin.*` supplement records (verification checklists).
- [ ] **ADMIN-270** Owner approval queue UI from `owner-approval-queue.json`.
- [ ] **ADMIN-280** Enforce publication gate in UI (no publish without approval).
- [ ] **ADMIN-281** Apply `seed-settings.json` defaults in site settings admin.

## ADM-5 — Quality and release

- [ ] **ADMIN-250** Complete `WORKFLOW-API-MAP.md` — every mutation mapped to permission test.
- [ ] **ADMIN-290** Browser matrix CI (signed out, MFA, forbidden, validation, stale revision).
- [ ] **ADMIN-300** Integrated staging smoke with backend.
- [ ] **ADMIN-320** Release evidence (`R6` + `R8` admin).

---

## Completed baseline

- [x] Repository connected; legacy rejection documented.
- [x] React/Vite architecture accepted (ADR-0003).
- [x] Design authority + graph-editor boundary read.
