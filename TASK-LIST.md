> Current content-completion execution: 2026-09-07. See the central reviews/IMPLEMENTATION-2026-09-07.md and execution-tasks.json; earlier narrative counts are historical.

# Admin Panel Task List

<!-- PRODUCT-V2.1 -->

## Active V2.1 packets — ADMIN

Parent groups and retired CA IDs are not assignments. Dependencies and exact files: `../../Docs/05-delivery/concept-alignment-v2/execution-tasks.json`. Implementation/visual/publication gates remain open.

| Packet              | State                  | Specification                                                                        |
| ------------------- | ---------------------- | ------------------------------------------------------------------------------------ |
| PU-SYNC-admin       | IMPLEMENTED_UNREVIEWED | `../../Docs/05-delivery/concept-alignment-v2/product-packets/PU-SYNC-admin.md`       |
| PU-09-transport     | BLOCKED                | `../../Docs/05-delivery/concept-alignment-v2/product-packets/PU-09-transport.md`     |
| PU-09-editor        | BLOCKED                | `../../Docs/05-delivery/concept-alignment-v2/product-packets/PU-09-editor.md`        |
| PU-09-host          | BLOCKED                | `../../Docs/05-delivery/concept-alignment-v2/product-packets/PU-09-host.md`          |
| PU-10-research      | BLOCKED                | `../../Docs/05-delivery/concept-alignment-v2/product-packets/PU-10-research.md`      |
| PU-10-publication   | BLOCKED                | `../../Docs/05-delivery/concept-alignment-v2/product-packets/PU-10-publication.md`   |
| PU-10-project       | NOT_STARTED            | `../../Docs/05-delivery/concept-alignment-v2/product-packets/PU-10-project.md`       |
| PU-10-article       | NOT_STARTED            | `../../Docs/05-delivery/concept-alignment-v2/product-packets/PU-10-article.md`       |
| PU-10-course        | NOT_STARTED            | `../../Docs/05-delivery/concept-alignment-v2/product-packets/PU-10-course.md`        |
| PU-10-lesson        | NOT_STARTED            | `../../Docs/05-delivery/concept-alignment-v2/product-packets/PU-10-lesson.md`        |
| PU-10-creative      | NOT_STARTED            | `../../Docs/05-delivery/concept-alignment-v2/product-packets/PU-10-creative.md`      |
| PU-10-book          | NOT_STARTED            | `../../Docs/05-delivery/concept-alignment-v2/product-packets/PU-10-book.md`          |
| PU-10-talk          | NOT_STARTED            | `../../Docs/05-delivery/concept-alignment-v2/product-packets/PU-10-talk.md`          |
| PU-10-resource      | NOT_STARTED            | `../../Docs/05-delivery/concept-alignment-v2/product-packets/PU-10-resource.md`      |
| PU-10-collection    | NOT_STARTED            | `../../Docs/05-delivery/concept-alignment-v2/product-packets/PU-10-collection.md`    |
| PU-10-series        | NOT_STARTED            | `../../Docs/05-delivery/concept-alignment-v2/product-packets/PU-10-series.md`        |
| PU-08-settings      | NOT_STARTED            | `../../Docs/05-delivery/concept-alignment-v2/product-packets/PU-08-settings.md`      |
| PU-08-profile       | NOT_STARTED            | `../../Docs/05-delivery/concept-alignment-v2/product-packets/PU-08-profile.md`       |
| PU-11-media         | NOT_STARTED            | `../../Docs/05-delivery/concept-alignment-v2/product-packets/PU-11-media.md`         |
| PU-12-home          | NOT_STARTED            | `../../Docs/05-delivery/concept-alignment-v2/product-packets/PU-12-home.md`          |
| PU-12-graph         | NOT_STARTED            | `../../Docs/05-delivery/concept-alignment-v2/product-packets/PU-12-graph.md`         |
| PU-12-jobs          | NOT_STARTED            | `../../Docs/05-delivery/concept-alignment-v2/product-packets/PU-12-jobs.md`          |
| PU-22-analytics     | NOT_STARTED            | `../../Docs/05-delivery/concept-alignment-v2/product-packets/PU-22-analytics.md`     |
| PU-25-admin-journey | NOT_STARTED            | `../../Docs/05-delivery/concept-alignment-v2/product-packets/PU-25-admin-journey.md` |

## Historical milestones

Rows below preserve their original evidence and are not reverified by this documentation delivery.
<!-- /PRODUCT-V2.1 -->

Historical milestone register. Current dispatch queue: `../../Docs/05-delivery/concept-alignment-v2/EXECUTION.md`; filter repository `ADMIN`.

Status: `[x]` done, `[ ]` open, `[~]` in progress.

---

## ADM-0 — Scaffold and toolchain

- [x] **ADMIN-010** Init React 19 + Vite + TypeScript 5.9; lockfile; `npm run build` green.
- [x] **ADMIN-011** ESLint + Prettier + Vitest baseline.
- [x] **ADMIN-012** GitHub Actions: install, typecheck, unit tests, build.
- [x] **ADMIN-013** ADRs: auth, state, editor, testing, deployment.

## ADM-1 — Auth and API client

- [x] PS-05 admin OpenAPI accepted; type generation unblocked.
- [x] **ADMIN-030** Env schema (`VITE_API_BASE`, proxy assumptions).
- [x] **ADMIN-040** Same-origin dev proxy documented and working.
- [x] **ADMIN-050** Generate admin types from accepted OpenAPI hash.
- [x] **ADMIN-060** API client with CSRF hooks and cookie credentials.
- [x] **ADMIN-070** Error normalizer (`code/message/fields`, network, 403, 409).
- [x] **ADMIN-080** Sign-in flow.
- [x] **ADMIN-090** MFA / OTP challenge.
- [x] **ADMIN-100** Sign-out, session expiry, re-authentication.
- [x] **ADMIN-110** CSRF on all mutations; regression test without token.

## ADM-2 — Design system and shell

- [x] **ADMIN-120** Admin tokens + table, form, dialog, notice, upload primitives.
- [x] **ADMIN-130** Permission-aware nav; forbidden/unauthorized states.
- [x] **ADMIN-131** RTL text entry and long-content layout checks.

## ADM-3 — Core workflows

- [x] **ADMIN-140** Dashboard + backend health/degraded status.
- [x] **ADMIN-150** Profile + site settings.
- [x] **ADMIN-160** Articles/series CRUD, filters, pagination.
- [x] **ADMIN-170** Research, publications, projects collections.
- [x] **ADMIN-171** Books, talks, downloads, courses, creative work.
- [x] **ADMIN-180** Media library: upload, metadata, usage, delete protection.
- [x] **ADMIN-190** Home module composition and ordering.
- [x] **ADMIN-200** Timeline editor + validation.
- [x] **ADMIN-210** Graph editor (nodes, edges, groups) per reference boundary.
- [x] **ADMIN-220** Preview-share tokens.
- [x] **ADMIN-230** Revision history + restore + conflict UI.
- [x] **ADMIN-240** Schedule, publish, archive, bulk actions.

## ADM-4 — Seed supplement and approval queue

- [x] **ADMIN-260** Surface `admin.*` supplement records (verification checklists).
- [x] **ADMIN-270** Owner approval queue UI from `owner-approval-queue.json` (served live from seed records via `GET /api/v1/admin/approval-queue`, BACKEND-210).
- [x] **ADMIN-280** Enforce publication gate in UI (no publish without approval; server-enforced via `409 APPROVAL_REQUIRED`, BACKEND-210).
- [x] **ADMIN-281** Apply `seed-settings.json` defaults in site settings admin (seedPolicy served from `GET /api/v1/admin/site`, BACKEND-211; read-only panel labels seed-managed surfaces).

## ADM-5 — Quality and release

- [x] **ADMIN-250** Complete `WORKFLOW-API-MAP.md` — every mutation mapped to permission test (BACKEND-190 gap list recorded).
- [x] **ADMIN-290** Browser matrix CI (signed out, MFA, forbidden, validation, stale revision) — Playwright + mocked API boundary (server guard _enforcement_ stays in the Back-End suite).
- [ ] **ADMIN-300** Integrated staging smoke with backend.
- [ ] **ADMIN-320** Release evidence (`R6` + `R8` admin).

---

## Completed baseline

- [x] Repository connected; legacy rejection documented.
- [x] React/Vite architecture accepted (ADR-0003).
- [x] Design authority + graph-editor boundary read.
