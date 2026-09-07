# PU-22-analytics Handoff

- Packet: `PU-22-analytics` (ADMIN)
- Status: `PU-22-analytics_HANDOFF_READY`
- Repository: `Front-End/admin-panel`

## Summary of Changes

1. `src/lib/api/analytics.ts` (NEW):
   - Implemented API client for `GET /api/v1/admin/analytics` conforming to §I07.
   - Types for `AnalyticsRow`, `AnalyticsReportOut`, and `AnalyticsFilter`.

2. `src/pages/AnalyticsPage.tsx` (NEW):
   - Implemented first-party aggregate analytics dashboard displaying authenticated date/locale event counts.
   - Surface explicit metric definitions and privacy notice (received events, zero cookies/tracking scripts, crawl inflation disclaimer, event type dictionary).
   - Date range controls (from/to) and locale filter (`all`, `en`, `fa`).
   - Handled empty state ("No events recorded for the selected date range and locale").
   - Handled not-connected state (when endpoint returns 404 / service not mounted).
   - Handled server error state with retry.

3. `src/components/Nav.tsx`:
   - Added `/analytics` ("Analytics") to `ADMIN_NAV_ITEMS` with staff authorization.

4. `src/app/router.tsx`:
   - Added protected route `/analytics` rendering `AnalyticsPage`.

5. `src/pages/AnalyticsPage.test.tsx` (NEW):
   - Captured initial failing test before implementation.
   - Tested event count rendering, metric definitions display, empty state, not-connected state (404), and error state (500) with retry.

## Verification

- `npm test -- src/pages/AnalyticsPage.test.tsx`: 4/4 tests passed.
- `npm test`: 46 test files, 185 tests passed.
- `npm run lint`: 0 errors.
- `npm run build`: built cleanly in 959ms.
