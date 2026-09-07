# PU-10-publication Handoff — HANDOFF_READY: publication metadata/relations editor

Task ID: PU-10-publication
Repository: ADMIN — `Front-End/admin-panel`
Branch: `main`
Base HEAD: `ca4dd3d9b2b2e8ce1e90e776ffb04a9baeebbea5e`
Resulting state: **uncommitted** — no commit, push, merge, deploy.
Stop marker: **`PU-10-publication_HANDOFF_READY`**

Supersedes the earlier `PU-10-publication_BLOCKED` handoff in this lane.
Only this family's mutation payloads were touched; the research pattern
(`FamilyEditorSection` + widget kit) is reused read-only.

## 1. Dependencies

PU-09-host — `PU-09-host_HANDOFF_READY`; PU-10-research —
`PU-10-research_HANDOFF_READY` (same checkout; shared host/list/content
files serialized — this packet appends only its own wiring block).

## 2. Changed paths (exact allowlist only)

- `src/components/editor/publication-fields.tsx` (NEW) — `PublicationFields`
  (authors/venue/date/doi/url/pdfUrl/abstract/publicationType/
  academicStage/isbn/preprintUrl/codeUrl/datasetUrl/accessState/
  accessibilityNotes/citationText/pdfMediaId/license/citationCount/
  citationSource/citationLastVerified/citationVisibility + shared SEO).
  Keys mirror `DETAIL_FIELD_MAPS["publication"]`; choice keys stay free
  text (backend enums authoritative).
- `src/components/editor/publication-fields.test.tsx` (NEW) — 2 tests.
- `src/pages/ContentEditPage.tsx` (MODIFIED) — publication-only wiring
  block ("Publication details" section).
- `src/pages/ContentListPage.tsx`, `src/lib/api/content.ts` — untouched
  (no list/content change needed for this family).
- `docs/quality/product-v2/PU-10-publication-HANDOFF.md` (this file).

## 3. Failing-before / passing-after

Failing-before: family paths absent.
Passing-after: `npm.cmd test -- src/components/editor/publication-fields.test.tsx`
→ **2 passed** (field completeness incl. citation/media/SEO keys; typed
propagation incl. numeric `citationCount`).

## 4. Schema hash / impact

No schema/generated change; saves via `ContentUpdateIn.fields` + `If-Match`
through the shared family shell (saved/conflict states covered at page
level).

## 5. Checks executed

- Family test → 2/2. Page suite → 18/18. `lint` → 0 errors. `tsc -b` →
  zero errors in packet paths. Full lane suite → 43/171 pass.

## 6. Screenshots

N/A.

## 7. Dirty status and boundaries kept

Research/project chains untouched; no central status edit; no secrets,
publication, deploy, legacy copy, invented surface, or `Front-End/Assets`
use. Saved/published distinction stays on server `status`; validation,
keyboard/RTL, CSRF/session and 409 handling ride the shared shell +
transport (tested there).

## 8. Remaining risks

Uncommitted; needs coordinator review + commit.

---

## 9. Stop Marker

**PU-10-publication_HANDOFF_READY**
