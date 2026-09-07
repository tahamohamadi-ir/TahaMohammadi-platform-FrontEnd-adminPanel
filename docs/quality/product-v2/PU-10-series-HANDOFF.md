# PU-10-series Handoff — HANDOFF_READY: series metadata/relations editor

Task ID: PU-10-series
Repository: ADMIN — `Front-End/admin-panel`
Branch: `main`
Base HEAD: `ca4dd3d9b2b2e8ce1e90e776ffb04a9baeebbea5e`
Resulting state: **uncommitted** — no commit, push, merge, deploy.
Stop marker: **`PU-10-series_HANDOFF_READY`**

End of the assigned PU-10 chain (research → series).

## 1. Dependencies

PU-09-host — `PU-09-host_HANDOFF_READY`; PU-10-collection —
`PU-10-collection_HANDOFF_READY` (same checkout, serialized).

## 2. Changed paths (exact allowlist only)

- `src/components/editor/series-fields.tsx` (NEW) — `SeriesFields`
  (description/numeric ordering/ordered members + shared SEO). Keys mirror
  `DETAIL_FIELD_MAPS["series"]` (`ordering` is a `PositiveIntegerField`).
- `src/components/editor/series-fields.test.tsx` (NEW) — 2 tests.
- `src/pages/ContentEditPage.tsx` (MODIFIED) — series-only wiring block.
- `src/pages/ContentListPage.tsx`, `src/lib/api/content.ts` — untouched.
- `docs/quality/product-v2/PU-10-series-HANDOFF.md` (this file).

## 3. Failing-before / passing-after

Family test → **2 passed** (completeness; numeric ordering propagation).

## 4. Schema hash / impact

No schema/generated change; saves via `ContentUpdateIn.fields` + `If-Match`.

## 5. Checks executed

Family test → 2/2. `lint` → 0 errors. `tsc -b` → zero errors in packet
paths. Full lane suite → 43 files / 171 tests pass (incl. all 12 family
suites + story host + transport + sync contracts).

## 6. Screenshots

N/A.

## 7. Dirty status and boundaries kept

As per sibling family packets. `ContentEditPage.tsx` now hosts all 12
family sections behind per-entity guards; each packet's diff is
additive-only.

## 8. Remaining risks

Uncommitted; needs coordinator review + commit. The chain's shared
`tsc -b` gate is held only by the concurrent PU-08-settings lane's
in-progress `SettingsPage.tsx` errors (foreign files, untouched here).

---

## 9. Stop Marker

**PU-10-series_HANDOFF_READY**
