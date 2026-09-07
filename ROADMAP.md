# Admin Panel Roadmap

<!-- PRODUCT-V2.1 -->

Current execution target: research-first bilingual portfolio, independently publishable detail pages and broad CMS editing under ADR-0010. Dispatch only this repository's packets from `../../Docs/05-delivery/concept-alignment-v2/EXECUTION.md` (paths here are repository-relative). Older scaffold/phase status below is a dated baseline, not current feature acceptance. Preserve current endpoints until the additive target contract is implemented and exported.
<!-- /PRODUCT-V2.1 -->

1. **A0 — Pre-scaffold gates:** pass `Docs\10-tracking\PRE-SCAFFOLD-READINESS.md`; resolve package manager, auth/session, OpenAPI type source, state/editor choices, testing, deployment, and admin visual-baseline decisions.
2. **A1 — Foundation:** scaffold, CI, environment validation, API client, error model, design tokens, accessible shell.
3. **A2 — Access:** sign-in, sign-out, session expiry, CSRF, MFA, permission-aware navigation, forbidden states.
4. **A3 — Content:** lists, filters, create/edit, translations, validation, revisions, preview, publish/archive.
5. **A4 — Rich workflows:** media, home composition, timeline, graph, site configuration, scheduling, bulk actions.
6. **A5 — Reliability:** conflict handling, autosave decision, retry boundaries, audit visibility, degraded states.
7. **A6 — Quality and cutover:** accessibility, security, browser, performance, E2E, preview release, rollback.
