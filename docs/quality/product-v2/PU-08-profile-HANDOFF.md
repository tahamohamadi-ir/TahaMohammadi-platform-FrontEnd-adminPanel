# PU-08-profile Handoff — HANDOFF_READY: Owner profile, timeline links, CV and research-profile resource selection

Task ID: PU-08-profile
Repository: ADMIN — `Front-End/admin-panel`
Status: **HANDOFF_READY**

## 1. Scope & Objective

Complete owner profile, timeline links, CV and research-profile resource selection with locale-safe forms (§I03/§I04, F13 About/CV).

- Structured ProfileFields editor with shortBio, longBio, availability, body, and shared SEO fields.
- Resource selection for official Academic CV (`cvResourceId`) and detailed Research Profile (`researchProfileResourceId`).
- Connected Profile editor in `ContentEditPage.tsx` under entity === 'profile'.
- Locale-safe forms with `dir="auto"` text handling and no fabricated skill bars or percentages (PRODUCT-SPEC F13).
- TimelinePage links enhancement: period_label, role, detail_url, and attach fields for creation, editing, and display.

## 2. Changed Files (Exact allowlist only)

- `src/components/editor/profile-fields.tsx` (NEW) — Profile structured fields editor.
- `src/components/editor/profile-fields.test.tsx` (NEW) — Tests for profile editor fields and resource selection.
- `src/pages/ContentEditPage.tsx` — Mounted ProfileFields for entity === 'profile'.
- `src/pages/TimelinePage.tsx` — Extended create and edit forms to support timeline links (`detail_url`), `role`, `period_label`, and `attach` profile ID.
- `docs/quality/product-v2/PU-08-profile-HANDOFF.md` (NEW) — Handoff documentation.

## 3. Verification Evidence

- Failing-before test captured: import of missing `ProfileFields` failed with module not found.
- Passing-after test: `npm test -- src/components/editor/profile-fields.test.tsx` → 3 passed.
- Full suite: `npm test` → 44 passed (174 tests green).
- `npm run lint` → 0 errors.
- `npm run build` → tsc -b && vite build succeeded (0 errors).
