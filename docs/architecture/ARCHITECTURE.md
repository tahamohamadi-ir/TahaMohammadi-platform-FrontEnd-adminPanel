# Admin Panel Architecture

<!-- PRODUCT-V2.1 -->

Current execution target: research-first bilingual portfolio, independently publishable detail pages and broad CMS editing under ADR-0010. Dispatch only this repository's packets from `../../Docs/05-delivery/concept-alignment-v2/EXECUTION.md` (paths here are repository-relative). Older scaffold/phase status below is a dated baseline, not current feature acceptance. Preserve current endpoints until the additive target contract is implemented and exported.
<!-- /PRODUCT-V2.1 -->

The admin panel is an independently deployed authenticated React and TypeScript client, built with Vite, for the backend admin API. Authentication, state-management, editor, and deployment details remain ADR-controlled.

Required layers are environment validation, session/auth boundary, typed API transport, domain workflow adapters, server-state cache, local form state, accessible design primitives, workflow compositions, and observability with redaction.

Components do not call raw endpoints. The API layer owns transport and normalized errors; workflow services own mutation sequencing and invalidation; forms own editable state; the server owns authorization and publication truth.
