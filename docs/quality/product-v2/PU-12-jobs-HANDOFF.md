# PU-12-jobs Handoff

- Packet: `PU-12-jobs` (ADMIN)
- Status: `PU-12-jobs_HANDOFF_READY`
- Repository: `Front-End/admin-panel`

## Summary of Changes

1. `src/pages/PublicationJobsPage.tsx` (NEW):
   - Implemented publication jobs monitoring page conforming to §I06.
   - Clear architectural distinction between immediate CMS record saves and asynchronous public site deployment jobs.
   - State and locale filtering (`all`, `queued`, `running`, `completed`, `failed`; `all`, `en`, `fa`).
   - Surfaces affected paths, revoked paths, and pending removal states (`not_requested`, `pending`, `removed`).
   - Displays safe error codes (`errorCode`) without exposing sensitive stack traces.
   - Implemented safe, idempotent retry action (`POST /api/v1/admin/publication-jobs/{id}/retry`) with `If-Match: updatedAt` and client-generated `Idempotency-Key`.

2. `src/components/Nav.tsx`:
   - Registered `/publication-jobs` ("Publication jobs") in `ADMIN_NAV_ITEMS` with staff authorization.

3. `src/app/router.tsx`:
   - Added protected route `/publication-jobs` rendering `PublicationJobsPage`.

4. `src/pages/DashboardPage.tsx`:
   - Added "Deployment & publication" overview section explaining save vs. site deployment distinction and linking directly to `/publication-jobs`.

5. `src/pages/PublicationJobsPage.test.tsx` (NEW):
   - Added focused failing test first verifying rendering, distinction banner, pending removal states, safe error display, and job retry execution.
   - Verified that all 2 tests pass cleanly.

## Verification

- `npm test -- src/pages/PublicationJobsPage.test.tsx`: 2/2 tests passed.
- `npm test`: 45 test files, 181 tests passed.
- `npm run lint`: 0 errors.
- `npm run build`: built cleanly in 925ms.
