# PU-10-project Handoff — HANDOFF_READY: project metadata/relations editor

Task ID: PU-10-project
Repository: ADMIN — `Front-End/admin-panel`
Branch: `main`
Base HEAD: `ca4dd3d9b2b2e8ce1e90e776ffb04a9baeebbea5e`
Resulting state: **uncommitted** — no commit, push, merge, deploy.
Stop marker: **`PU-10-project_HANDOFF_READY`**

## 1. Dependencies

PU-09-host — `PU-09-host_HANDOFF_READY`; PU-10-publication —
`PU-10-publication_HANDOFF_READY` (same checkout, serialized on the shared
host file — this packet appends only its own wiring block).

## 2. Changed paths (exact allowlist only)

- `src/components/editor/project-fields.tsx` (NEW) — `ProjectFields`
  (projectType/objective/methodsSummary/role/startDate/endDate/license/
  codeAvailability/dataAvailability/demoAvailability/codeUrl/dataUrl/
  demoUrl/showOnProjects + shared SEO). Keys mirror
  `DETAIL_FIELD_MAPS["project"]`. Case-study/evidence/collaborator/funding
  editing stays on the existing atomic endpoints (PU-04-project-evidence).
- `src/components/editor/project-fields.test.tsx` (NEW) — 2 tests.
- `src/pages/ContentEditPage.tsx` (MODIFIED) — project-only wiring block.
- `src/pages/ContentListPage.tsx`, `src/lib/api/content.ts` — untouched.
- `docs/quality/product-v2/PU-10-project-HANDOFF.md` (this file).

## 3. Failing-before / passing-after

Failing-before: family paths absent.
Passing-after: `npm.cmd test -- src/components/editor/project-fields.test.tsx`
→ **2 passed** (field completeness; typed + boolean propagation).

## 4. Schema hash / impact

No schema/generated change; saves via `ContentUpdateIn.fields` + `If-Match`.

## 5. Checks executed

Family test → 2/2. `lint` → 0 errors. `tsc -b` → zero errors in packet
paths. Full lane suite → 43 files / 171 tests pass.

## 6. Screenshots

N/A.

## 7. Dirty status and boundaries kept

No other family's files touched; no central status edit; no secrets,
publication, deploy, legacy copy, invented surface, or `Front-End/Assets`
use. Saved/published, validation, keyboard/RTL, CSRF/session, 409 handling
ride the shared shell + transport (tested there).

## 8. Remaining risks

Uncommitted; needs coordinator review + commit.

---

## 9. Stop Marker

**PU-10-project_HANDOFF_READY**
