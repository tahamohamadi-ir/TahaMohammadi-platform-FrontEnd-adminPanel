# PU-09-host Handoff — HANDOFF_READY: story connected to the generic content editor

Task ID: PU-09-host
Repository: ADMIN — `Front-End/admin-panel`
Branch: `main`
Base HEAD: `ca4dd3d9b2b2e8ce1e90e776ffb04a9baeebbea5e`
Resulting state: **uncommitted** — no commit, push, merge, deploy.
Stop marker: **`PU-09-host_HANDOFF_READY`**

Supersedes the earlier `PU-09-host_BLOCKED` handoff in this lane: the
PU-09-editor `StoryEditor` now exists, so the connection below mounts a
real component against real adapters.

## 1. Dependency

PU-09-editor — `PU-09-editor_HANDOFF_READY` (same checkout, 6/6 editor
tests green).

## 2. Changed paths (exact allowlist only)

- `src/lib/api/content.ts` (MODIFIED, additive) — `STORY_ENTITIES` (the 13
  entities with `"story"` in backend `DETAIL_FIELD_MAPS`) +
  `entitySupportsStory()`; existing CRUD untouched.
- `src/pages/ContentEditPage.tsx` (MODIFIED) — `StorySection` (attach with
  client kind/locale pre-checks + server-validated `fields.storyId` PUT
  with `If-Match`; detach via `storyId: null`, which the backend FK
  coercion clears) + `StoryAttachedEditor` (preview of attached story
  title/status/locale + embedded `StoryEditor` wired to
  `useUpdateComposition`, conflict mine/theirs resolution). Rendered only
  in edit mode for story-bearing entities, after the metadata form and
  before lifecycle. Plus the generic `FamilyEditorSection` shell reused by
  the PU-10 family packets (save-via-`If-Match` with visible
  saved/conflict states; metadata/revision workflow untouched).
- `src/pages/ContentEditPage.test.tsx` (MODIFIED) — 6 new tests (story
  attach with `If-Match`, non-story refusal without PUT, attached preview
  - block-save 409 conflict, article family save + conflict).
- `docs/quality/product-v2/PU-09-host-HANDOFF.md` (this file).

## 3. Failing-before / passing-after

Failing-before: `StoryEditor.tsx` absent; no story UI on the edit page.
Passing-after: `npm.cmd test -- src/pages/ContentEditPage.test.tsx` →
**18 passed** (12 pre-existing incl. metadata/revision/preview flows
unchanged + 6 new). Two interim selector collisions from the new family
sections (`/title/i`, `/excerpt/i` matching added controls) were fixed by
anchoring/scoping the old assertions — no assertion weakened.

## 4. Schema hash / impact

- No schema/generated change. Story writes reuse `ContentUpdateIn.fields`
  (`storyId`); block writes reuse `CompositionUpdateIn` + `If-Match`.
- Backend remains the authority on story kind (`story` only), exact-locale
  match, and unknown ids (400 `VALIDATION`, fields `[storyId]`) — all
  surfaced visibly.

## 5. Checks executed

- `npm.cmd test -- src/pages/ContentEditPage.test.tsx` → 18/18 pass.
- `npm.cmd run lint` → 0 errors.
- `tsc -b` → zero errors in this packet's paths.
- Full lane suite → 43 files / 171 tests pass.

## 6. Screenshots

N/A — DOM/behavioral evidence only.

## 7. Dirty status and boundaries kept

`ContentListPage.tsx` intentionally untouched (no list change needed).
Concurrent PU-08-settings files preserved untouched. No central status
edit; no secrets, publication, deploy, legacy copy, invented surface, or
`Front-End/Assets` use.

## 8. Remaining risks

- Uncommitted; needs coordinator review + commit.
- No admin route lists story-kind compositions for picking; selection is by
  numeric id with client pre-checks + server validation.

---

## 9. Stop Marker

**PU-09-host_HANDOFF_READY**
