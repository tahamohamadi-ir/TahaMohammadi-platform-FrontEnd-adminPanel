# PU-25-admin-journey — corrected evidence, 2026-09-07

Owner: ADMIN. Base: `21e2f73cfe653cf53146afda642dc021df5718e4`. Result: committed as `fbb61d5` on `cx/content-completion-2026-09-07` (pushed).

## Corrected scope

This handoff supersedes the old unsupported E2E and RTL assertions. The removed `tests/e2e/product-journey.spec.ts` only asserted a hard-coded route array in Vitest; Playwright selects `*.e2e.ts`, so its alternate branch was not a configured browser test. Its existence never proved a public delivery journey.

`src/pages/product-journey.test.tsx` now exercises actual components and the existing authenticated API adapters with mocked HTTP:

- Search media through `/api/v1/admin/media`, assert query/filter/paging and cookie credentials, choose a returned record and preserve `number[]`.
- Edit a project, save through its PUT endpoint, assert payload, draft state, If-Match and CSRF. Open publish confirmation without mutating; confirm POST transition; hold backend acknowledgment to prove the UI stays draft while pending, then verify published state after acknowledgment/refetch.
- Existing 409 and unavailable-content notices remain covered.
- The old Persian-text-only test now checks a real RTL ancestor; it failed first because the host ContentEditPage had no locale direction. The coordinator authorized a bounded host fix: its main content now derives dir from the loaded record locale.

Synthetic fixtures are test content only. No real data was published.

## Current checks

`npm.cmd test -- src/pages/product-journey.test.tsx src/components/editor/StoryEditor.test.tsx --reporter=dot`: **17 passed** (12 StoryEditor + 5 mocked-HTTP journey cases). The Persian host direction regression is repaired. `npm.cmd test -- src/pages/ContentEditPage.test.tsx --reporter=dot`: **18 passed**. Focused ESLint passes with no errors/warnings. Full suite and build deferred to coordinator.

## 2026-09-07 — Re-verification (committed `fbb61d5`, plus test-type fix)

- Joint run re-executed: **17 passed**. `npm run lint` -> 0 errors
  (6 pre-existing react-refresh warnings). `npm run build` (`tsc -b` +
  vite) -> **green** after adding required `enabled`/`layout`/`ratio`
  fields and a complete media-page mock in `StoryEditor.test.tsx`
  (test-only change).

## Changed paths

- `src/pages/product-journey.test.tsx`
- `src/pages/ContentEditPage.tsx` — loaded record locale determines content direction; coordinator-expanded scope.
- `tests/e2e/product-journey.spec.ts` — deleted misleading test scaffold.
- `docs/quality/product-v2/PU-25-admin-journey-HANDOFF.md`

## Open acceptance gate

Authenticated browser → real backend draft/save/conflict/media/locale → explicit publish → rebuild/result → correct public rendered content remains **OPEN**. These HTTP-mocked component tests are not evidence of live integration, release delivery, production access, or owner acceptance. No claim of PU-25 acceptance is made.

## 2026-09-07 — Live journey spec (still gated, not yet executed)

- Added `tests/e2e/product-journey-live.e2e.ts`: API-driven live probe
  against staging — CSRF seed, `POST auth/login` (email/password/OTP),
  `POST content/article` draft with a unique marker, `PUT` edit with
  `If-Match` round-trip, `transition` to `published`, 10-minute poll of
  `/en/blog/{slug}/` for the marker, `finally` archive cleanup (no admin
  DELETE endpoint exists by design). Approval-gate rejections fail loudly.
- Endpoint shapes verified against `Back-End/apps/api/admin_api.py`,
  `admin_content.py` (`VALID_STATUSES`, `ContentCreateIn`,
  `ContentDetailOut.updatedAt`, `rebuild_trigger` HMAC gate) and the
  public `/en/blog/[slug]` route before writing — no invented fields.
- Runs only when `ADMIN_JOURNEY_ADMIN_URL`, `ADMIN_JOURNEY_PUBLIC_URL`,
  `ADMIN_JOURNEY_EMAIL`, `ADMIN_JOURNEY_PASSWORD` (`ADMIN_JOURNEY_OTP`
  optional) are set; verified locally: **1 skipped, 0 failed**, zero
  requests issued without env. `npm run lint` 0 errors, `npm run build`
  green.
- Unblock requirements (owner): staging backend + admin session creds,
  staging static rebuild after publish. No live system was touched.

`git diff --check` passed. Full-suite/build and live browser gates remain with the coordinator.
