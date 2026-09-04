# ADR — Form State

Status: Accepted

Date: 2026-08-31

## Context

Admin forms edit server-owned records with validation, optimistic locking, and conflict handling. The error envelope is normalized in `src/lib/api/errors.ts`.

## Decision

Use **controlled React component state** for editable form fields:

- Initial values from query results or empty create payloads.
- Server validation mapped via `AdminApiError.fieldErrors` and `ValidationSummary`.
- Form lifecycle states per `WORKFLOW-STATE-MATRIX.md`: pristine, dirty, validating, invalid, saving, saved, conflict, failed.
- Optimistic locking: workflow adapters send `If-Match` with entity revision headers where the OpenAPI operation requires it (content, site settings, media, home modules, timeline).
- Do not submit until required fields pass client-side HTML validation; server remains authoritative.
- Preserve dirty field values on validation failure; surface 409 stale-revision as conflict state with explicit reload/merge actions.

## Consequences

- No form library (React Hook Form, Formik) until a future ADR justifies it.
- Rich text fields use plain textarea/markdown in ADMIN-160 skeleton (see ADR-RICH-EDITOR).

## Related

- `src/lib/api/errors.ts`
- `docs/design/WORKFLOW-STATE-MATRIX.md`
