# PU-10-course Handoff — HANDOFF_READY: course metadata/relations editor

Task ID: PU-10-course
Repository: ADMIN — `Front-End/admin-panel`
Branch: `main`
Base HEAD: `ca4dd3d9b2b2e8ce1e90e776ffb04a9baeebbea5e`
Resulting state: **uncommitted** — no commit, push, merge, deploy.
Stop marker: **`PU-10-course_HANDOFF_READY`**

## 1. Dependencies

PU-09-host — `PU-09-host_HANDOFF_READY`; PU-10-article —
`PU-10-article_HANDOFF_READY` (same checkout, serialized).

## 2. Changed paths (exact allowlist only)

- `src/components/editor/course-fields.tsx` (NEW) — `CourseFields`
  (description/body/level/prerequisites/outcomes/courseFormat/
  courseLanguage/availability/license/lastUpdated/accessibilityNotes/
  coverMediaId + shared SEO). Keys mirror `DETAIL_FIELD_MAPS["course"]`.
  Lessons stay independent records linked by `courseId` (PU-05-lessons).
- `src/components/editor/course-fields.test.tsx` (NEW) — 2 tests.
- `src/pages/ContentEditPage.tsx` (MODIFIED) — course-only wiring block.
- `src/pages/ContentListPage.tsx`, `src/lib/api/content.ts` — untouched.
- `docs/quality/product-v2/PU-10-course-HANDOFF.md` (this file).

## 3. Failing-before / passing-after

Failing-before: family paths absent.
Passing-after: family test → **2 passed** (completeness incl.
prerequisites/outcomes/format/language/availability/lastUpdated/cover;
typed propagation).

## 4. Schema hash / impact

No schema/generated change; saves via `ContentUpdateIn.fields` + `If-Match`.

## 5. Checks executed

Family test → 2/2. `lint` → 0 errors. `tsc -b` → zero errors in packet
paths. Full lane suite → 43/171 pass.

## 6. Screenshots

N/A.

## 7. Dirty status and boundaries kept

As per sibling family packets.

## 8. Remaining risks

Uncommitted; needs coordinator review + commit.

---

## 9. Stop Marker

**PU-10-course_HANDOFF_READY**
