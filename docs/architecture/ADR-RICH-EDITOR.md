# ADR — Rich Text Editor

Status: Accepted (phase 1 deferral)

Date: 2026-08-31

## Context

Article and long-form content workflows need rich editing. No editor choice was locked at scaffold time. Inventing HTML schema or custom document models risks contract drift.

## Decision

**Phase 1 (ADMIN-160 skeleton):** use accessible `<textarea>` (or markdown plain text) bound to API `fields` keys exactly as returned by `ContentSchemaOut`. No WYSIWYG, no invented markup.

**Phase 2 (future):** adopt a rich editor (e.g. TipTap) only after:

- A dedicated ADR names the editor, serialization format, and sanitization policy.
- Backend writable-field metadata confirms supported field types.
- Accessibility and paste/upload boundaries are tested.

## Consequences

- Content editors ship with honest plain-text editing until phase 2.
- Graph, timeline, and media UIs are unaffected.

## Related

- ADR-FORM-STATE
- `docs/architecture/WORKFLOW-API-MAP.md`
