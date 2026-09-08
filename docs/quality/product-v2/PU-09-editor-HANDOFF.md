# PU-09-editor — CM-08 usable story controls revision

Date: 2026-09-07. Owner: ADMIN. Result: committed as `fbb61d5` on `cx/content-completion-2026-09-07` (pushed).
Base: `21e2f73cfe653cf53146afda642dc021df5718e4` on `cx/content-completion-2026-09-07`.

## Change and interface evidence

The editor uses cell inputs tied to the table columns, with row add/remove and column label controls. Internal column keys are generated and retained; deleting a column also removes its cells. Media fields use the authenticated media library with search, paging, selected-item titles, removal and ordering. File blocks select actual download records. Related records use existing content list/detail adapters and the story locale; backend family tokens map explicitly to admin entity names. No raw JSON or numeric ID entry remains in story controls.

Selections and cells are controlled from `sections`. External reloads immediately replace them. Asynchronous library responses are guarded against stale requests; a library error preserves selections and offers retry. Structured arrays retain their schema types. Visible validation blocks both Save story and Save mine on top for incomplete required values, invalid typed values, schema item bounds, nested required items, duplicate columns or unknown row columns. Empty table rows remain valid under the backend contract. Backend validation and permissions remain authoritative.

The revision extends existing dirty/user work from the preceding session; current base includes that earlier work. No other repository, generated API, SettingsPage or publishing behavior was changed by this worker. A coordinator-authorized loaded-locale direction fix in ContentEditPage is documented in the journey handoff.

## Exact changed paths

- `src/components/editor/StoryEditor.tsx`
- `src/components/editor/StoryEditor.test.tsx`
- `src/components/editor/story-editor.css`
- `src/components/editor/story-library-fields.tsx`
- `src/components/editor/story-validation.ts`
- `docs/quality/product-v2/PU-09-editor-HANDOFF.md`

The two helper paths extend the original packet allowlist under the owner's current implementation instruction; coordinator must retain them in the packet/register. Journey test paths are documented separately in PU-25-admin-journey-HANDOFF.md.

## Verification

- Initial CM-08 regression run: 6 passed / 3 failed, demonstrating missing real library controls, unblocked invalid saves, and missing table cell reload controls.
- Current-base validation regression: 9 passed / 1 failed; a valid empty table was incorrectly rejected and nested/duplicate validation was absent.
- After repair: `npm.cmd test -- src/components/editor/StoryEditor.test.tsx --reporter=dot` — **12 passed**.
- Focused ESLint for StoryEditor, tests, library helper and validator — **0 errors / 0 warnings**.
- Full suite/build: deferred to coordinator; historical full-suite/build claims do not certify this revision.
- Generated schema unchanged. Tracked schema marker SHA-256: `135f14e5c7f03ba1aaee50fca76a54e55e0ed5a2e0360050a8939e837859208c` (marker read, not a regenerated schema).

## 2026-09-07 — Build-green fix + re-verification

- `src/components/editor/StoryEditor.test.tsx` used section/block
  fixtures missing required `enabled` (and section `layout`/`ratio`) plus
  an unsafe media-page cast. Added the required fields and a complete
  `{ items, total, page, pageSize }` mock. Test-only change; no editor
  behavior changed.
- `npm test -- src/components/editor/StoryEditor.test.tsx src/pages/product-journey.test.tsx` -> **17 passed** (12 + 5).
- `npm run lint` -> 0 errors, 6 pre-existing react-refresh warnings.
- `npm run build` (`tsc -b` + vite) -> **green**.

## Open gates

No screenshot or browser visual acceptance captured. No authenticated live-backend save/publication cycle or generated-public-page comparison performed. No deployment, commit, push, production data write, or owner acceptance is claimed. Browser RTL, keyboard/focus and responsive table/library review remain required alongside coordinator checks.

**PU-09-editor_HANDOFF_READY** — focused implementation handoff only.
