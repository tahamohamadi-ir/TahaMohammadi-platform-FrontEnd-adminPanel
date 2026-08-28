# Admin Panel Architecture

The admin panel is an independently deployed authenticated client of the backend admin API. Framework selection is pending ADR.

Required layers are environment validation, session/auth boundary, typed API transport, domain workflow adapters, server-state cache, local form state, accessible design primitives, workflow compositions, and observability with redaction.

Components do not call raw endpoints. The API layer owns transport and normalized errors; workflow services own mutation sequencing and invalidation; forms own editable state; the server owns authorization and publication truth.
