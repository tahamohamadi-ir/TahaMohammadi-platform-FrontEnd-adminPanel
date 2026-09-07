# PU-09-transport Handoff — HANDOFF_READY: typed composition + publication-job adapters

Task ID: PU-09-transport
Repository: ADMIN — `Front-End/admin-panel`
Branch: `main`
Base HEAD: `ca4dd3d9b2b2e8ce1e90e776ffb04a9baeebbea5e`
Resulting state: **uncommitted** — no commit, push, merge, deploy.
Stop marker: **`PU-09-transport_HANDOFF_READY`**

Supersedes the earlier `PU-09-transport_BLOCKED` handoff in this lane: the
PU-SYNC-admin pin now matches the accepted backend snapshot, so the adapters
below type against real generated operations (verified, not invented).

## 1. Dependency

PU-SYNC-admin — `PU-SYNC-admin_HANDOFF_READY` (same checkout, pin
`1176c069…973564`, contract test 3/3 green).

## 2. Changed paths (exact allowlist only)

- `src/lib/api/composition.ts` (NEW) — list/detail/create/replace
  composition adapters + `fetchCompositionSchema` + `If-Match` replace +
  `isCompositionPublished` (server `status` only).
- `src/lib/api/publication-jobs.ts` (NEW) — job list/detail/retry adapters
  with `If-Match` + `Idempotency-Key` headers per
  `Back-End/apps/api/admin_publication_jobs.py`.
- `src/lib/api/hooks/useComposition.ts` (NEW) — React Query hooks with
  module-local keys (shared `queryKeys` registry untouched — outside
  allowlist).
- `src/lib/api/product-authoring.test.ts` (NEW) — 10 transport tests.
- `docs/quality/product-v2/PU-09-transport-HANDOFF.md` (this file).

Server envelopes reused as-is: `adminJson`/`adminFetch` (CSRF provider,
cookie credentials, `AdminApiError` normalization). No credential storage
added; no job states, endpoints, or validation invented.

## 3. Failing-before / passing-after

Failing-before: all four module paths absent (`Test-Path`: False); no
composition/publication-job client existed.
Passing-after: `npm.cmd test -- src/lib/api/product-authoring.test.ts` →
**10 passed**: list paths/params + omission; detail + real create payload;
PUT `If-Match` + 409 `STALE_REVISION`→`conflict`; saved/published
distinction on `status`; 400 `VALIDATION` with field errors; jobs paging
(`page_size`) + filters; job detail; retry `If-Match`+`Idempotency-Key`;
403 `OTP_REQUIRED`→`auth` and `CSRF_FAILED`→`csrf`. Keyboard/RTL: N/A (no
UI in this packet — covered at PU-09-editor with native controls).

## 4. Schema hash / impact

- Admin pin unchanged (`1176c069…973564`); adapters consume generated
  `Composition*` + `PublicationJob*` schemas only.
- No backend, generated, or editor file touched.

## 5. Checks executed

- `npm.cmd test -- src/lib/api/product-authoring.test.ts` → 10/10 pass.
- `npm.cmd run lint` → 0 errors.
- `tsc -b` → zero errors in this packet's paths (only remaining project
  errors are the concurrent PU-08-settings `SettingsPage.tsx` edits).
- Full lane suite → 43 files / 171 tests pass.

## 6. Screenshots

N/A — no UI changed.

## 7. Dirty status and boundaries kept

Shared-checkout files of other lanes preserved; no central status edit; no
secrets, publication, deploy, legacy copy, invented surface, or
`Front-End/Assets` use.

## 8. Remaining risks

- Uncommitted; needs coordinator review + commit.
- Retry `200 vs 201` both normalize to `PublicationJobOut` — verified
  against the OpenAPI response map.

---

## 9. Stop Marker

**PU-09-transport_HANDOFF_READY**
