# PU-08-settings Handoff — HANDOFF_READY: Localized site identity, navigation, SEO & scene presets

Task ID: PU-08-settings
Repository: ADMIN — `Front-End/admin-panel`
Status: **HANDOFF_READY**

## 1. Scope & Objective

Edit localized site identity, navigation, SEO and bounded scene presets beside existing operational settings.

- Locale tab selection for `en` and `fa`
- Localized site identity: brand name, tagline, footer text
- Localized SEO: title, description
- Bounded scene presets (§I04): graphPreset (`atlas-v2`), portalPreset (`arch-v2`), motion (`full`, `reduced`, `off`), density (`standard`, `low`)
- Audience entry links (§I04): research audience label/href, employment audience label/href
- Optimistic locking using `If-Match` with `updatedAt`
- Draft save and publish operations with success and conflict feedback

## 2. Changed Files (Exact allowlist only)

- `src/lib/api/settings.ts` — Localized types and endpoints (`fetchLocalizedSiteSettings`, `updateLocalizedSiteSettings`, `publishLocalizedSiteSettings`).
- `src/lib/api/hooks/useSiteSettings.ts` — React Query hooks (`useLocalizedSiteSettings`, `useUpdateLocalizedSiteSettings`, `usePublishLocalizedSiteSettings`).
- `src/pages/SettingsPage.tsx` — LocalizedSettingsSection component with locale tabs, form fields, scene preset selectors, audience entry links, and save/publish flows.
- `src/pages/SettingsPage.test.tsx` — Tests covering localized settings rendering, draft save with If-Match, publish mutation, and conflict handling.
- `docs/quality/product-v2/PU-08-settings-HANDOFF.md` — Handoff documentation.

## 3. Verification Evidence

- `npm test -- src/pages/SettingsPage.test.tsx` → 6 passed (all tests green).
- Full suite: `npm test` → 43 passed (171 tests green).
- `npm run lint` → 0 errors.
- `npm run build` → tsc -b && vite build succeeded (0 errors).
