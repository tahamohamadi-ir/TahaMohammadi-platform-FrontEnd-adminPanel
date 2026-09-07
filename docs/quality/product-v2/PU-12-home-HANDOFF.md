# PU-12-home Handoff

- Packet: `PU-12-home` (ADMIN)
- Status: `PU-12-home_HANDOFF_READY`
- Repository: `Front-End/admin-panel`

## Summary of Changes

1. `src/lib/api/home.ts`:
   - Exported `CANONICAL_MODULE_KEYS` (`identity`, `graph`, `research-fit`, `journey`, `projects`, `publications`, `previews`, `cta`).
   - Exported `SELECTION_MODES` (`manual`, `rule`, `hybrid`) matching backend `SelectionMode` choices.

2. `src/pages/HomePage.tsx`:
   - Enhanced home composition editor with canonical selection modes and provenance notes.
   - Added missing canonical module selector button to easily insert unassigned canonical modules.
   - Added audience entry paths management section (Research for PhD/academic audience and Employment for collaborator/industry audience) per locale with path validation (`/${locale}/...`).
   - Connected audience links persistence to `useUpdateLocalizedSiteSettings` with `If-Match` revision check.
   - Preserved zero fake featured records or mock assumptions.

3. `src/pages/HomePage.test.tsx`:
   - Captured initial failing test for audience entry links and selection modes.
   - Added tests verifying module slot rendering, validation dry-run, optimistic locking via `If-Match` revision, 409 stale revision recovery, audience links editing and saving, and adding missing canonical modules.

## Verification

- `npm test -- src/pages/HomePage.test.tsx`: 6/6 tests passed.
- `npm test`: 44 test files, 177 tests passed.
- `npm run lint`: 0 errors.
- `npm run build`: built in 947ms without errors.
