# PU-11-media Handoff — HANDOFF_READY: Upload cancel/retry, locale alt, focal point, usages & version-aware replacement UI

Task ID: PU-11-media
Repository: ADMIN — `Front-End/admin-panel`
Status: **HANDOFF_READY**

## 1. Scope & Objective

Complete upload cancel/retry, locale alt, focal point, usages and version-aware replacement UI (F08/F11, §I01/§I03).

- Upload form enhanced with:
  - Clear selection / Cancel upload button.
  - Retry upload capability on failure using last submitted payload.
  - English alt text (`altTextEn`) and Persian alt text (`altTextFa`).
  - Focal point selector with preset alignments (`center`, `top`, `bottom`, `face`).
- Media library table:
  - Usage column accurately displays reference counts or `Unused (orphan)` label.
  - Row actions provide `Edit metadata` and protected `Delete`.
- Edit Media Metadata dialog:
  - Allows editing title, `altTextEn`, `altTextFa`, focal point, and `isActive` flag.
  - Submits via `updateMediaMetadata` with optimistic locking (`If-Match: updatedAt`).
  - Handles 409 conflict states gracefully with a reload action.
- Delete confirmation dialog:
  - Explains file deletion and alerts when `usageCount > 0` that the backend will reject deletion with 409 MEDIA_IN_USE while referenced.

## 2. Changed Files (Exact allowlist only)

- `src/pages/MediaPage.tsx` — Full UI enhancements for upload cancel/retry, locale alt, focal point, usages, and metadata editing dialog.
- `src/pages/MediaPage.test.tsx` — Unit and integration tests for upload, delete guard, cancel/retry, locale alt text, and metadata edit.
- `docs/quality/product-v2/PU-11-media-HANDOFF.md` (NEW) — Handoff documentation.

## 3. Verification Evidence

- Failing-before test captured: missing locale alt inputs and metadata edit dialog.
- Passing-after test: `npm test -- src/pages/MediaPage.test.tsx` → 4 passed.
- Full suite: `npm test` → 44 passed (175 tests green).
- `npm run lint` → 0 errors.
- `npm run build` → tsc -b && vite build succeeded (0 errors).
