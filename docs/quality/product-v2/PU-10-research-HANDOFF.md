# PU-10-research Handoff — HANDOFF_READY: research metadata/relations editor

Task ID: PU-10-research
Repository: ADMIN — `Front-End/admin-panel`
Branch: `main`
Base HEAD: `ca4dd3d9b2b2e8ce1e90e776ffb04a9baeebbea5e`
Resulting state: **uncommitted** — no commit, push, merge, deploy.
Stop marker: **`PU-10-research_HANDOFF_READY`**

Supersedes the earlier `PU-10-research_BLOCKED` handoff in this lane: the
PU-09-host `FamilyEditorSection` shell now exists, so this family mounts a
real editor into it. Only this family's mutation payloads were touched.

## 1. Dependency

PU-09-host — `PU-09-host_HANDOFF_READY` (same checkout, 18/18 page tests
green).

## 2. Changed paths (exact allowlist only)

- `src/components/editor/research-fields.tsx` (NEW) — `ResearchFields`
  (topic: summary/motivation/problems/researchQuestions/methods/
  futureDirections; statement: body/statementPdfId; both: shared SEO +
  translationKey + relatedRecords) + the shared PU-10 widget kit
  (`FieldText/Textarea/Number/Boolean/Date/MediaId/JsonList`,
  `SharedSeoFields`) imported read-only by later family packets. Keys
  mirror backend `DETAIL_FIELD_MAPS`; choice-valued keys stay free text
  (backend enums are the authority).
- `src/components/editor/research-fields.test.tsx` (NEW) — 4 tests.
- `src/pages/ContentEditPage.tsx` (MODIFIED) — research-only wiring block
  (`research-topic`/`research-statement` → "Research details" section).
- `src/pages/ContentListPage.tsx` — untouched (generic table already
  covers research rows; no family column needed).
- `src/lib/api/content.ts` — untouched (generic update already carries
  family fields; `STORY_ENTITIES` came from PU-09-host).
- `docs/quality/product-v2/PU-10-research-HANDOFF.md` (this file).

## 3. Failing-before / passing-after

Failing-before: family paths absent; no research metadata UI.
Passing-after: `npm.cmd test -- src/components/editor/research-fields.test.tsx`
→ **4 passed** (field completeness guard; statement-only fields; typed
propagation without invented keys; malformed related-records JSON rejected
locally and never propagated). One interim harness failure (recreated mock
identity across re-renders) fixed test-side with a stable mock ref.

## 4. Schema hash / impact

- No schema/generated change. Saves go through `ContentUpdateIn.fields`
  with `If-Match`; 409 → visible conflict; 400 → server message.
- Real mutation payload verified at page level (article-shell test posts
  family fields with `If-Match` and asserts `Saved.`/conflict states).

## 5. Checks executed

- `npm.cmd test -- src/components/editor/research-fields.test.tsx` → 4/4.
- `npm.cmd test -- src/pages/ContentEditPage.test.tsx` → 18/18.
- `npm.cmd run lint` → 0 errors. `tsc -b` → zero errors in packet paths.
- Full lane suite → 43 files / 171 tests pass.

## 6. Screenshots

N/A — DOM/behavioral evidence only.

## 7. Dirty status and boundaries kept

No other family's files touched; no central status edit; no secrets,
publication, deploy, legacy copy, invented surface, or `Front-End/Assets`
use. CSRF/session expiry ride the shared `adminFetch` provider (covered by
transport tests); keyboard/RTL via native labeled controls + `dir="auto"`.

## 8. Remaining risks

- Uncommitted; needs coordinator review + commit.

---

## 9. Stop Marker

**PU-10-research_HANDOFF_READY**
