# Admin API Client Contract

The current route prefix is `/api/v1/admin/`, with registered capability groups for content, media, composition, overview, site configuration, MFA, home modules, timeline, and graph. This is an inventory, not permission to infer individual operations.

Build the client from accepted OpenAPI or verified endpoint definitions. Normalize request IDs, validation fields, authorization errors, conflicts, rate limits, and server failures. Mutations must guard double submission, preserve user input on recoverable failure, and revalidate affected server state only after confirmation.
