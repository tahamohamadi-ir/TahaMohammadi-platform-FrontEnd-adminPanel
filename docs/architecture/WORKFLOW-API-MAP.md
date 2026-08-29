# Workflow API Map

This map is an implementation gate, not an endpoint inventory. Exact methods and schemas come only from accepted authenticated admin OpenAPI artifacts.

| Workflow | Required backend evidence | Client lifecycle | Required failures | Acceptance evidence |
|---|---|---|---|---|
| Sign-in, MFA, re-authentication | Session, CSRF, MFA, timeout, permission contract | signed-out → challenge → verified → expired | validation, auth required, OTP required, forbidden, network | Disposable staff-plus-OTP browser test |
| Content create/edit/revision | Content schema, optimistic revision contract, audit behavior | draft → scheduled/published/archived where permitted | validation, stale revision, forbidden, network | Server-confirmed lifecycle and preserved unsaved input |
| Media | Upload constraints, metadata, usage/deletion rules | selected/uploading/processing/ready | validation, size/type, permission, in-use, network | Media identifier and server-confirmed state |
| Home modules | Composition schema, order/conflict rules | loading/editing/saving/confirmed | duplicate key/order, stale revision, forbidden | Preview and persisted server state |
| Timeline | Timeline schema and validation | loading/editing/saving/confirmed | type/weight/link/validation, stale revision | Ordered preview and saved state |
| Research graph | Graph version/node/group/edge schema and publish policy | draft/editing/validating/publishing | unknown endpoint, duplicate relation, immutable active, validation blocked | Validate/publish confirmation and public preview parity |
| Profile/site settings | Settings schema, permissions, contact policy | loading/editing/saving/confirmed | validation, forbidden, network | Reloaded server state |
| Rebuild/health | Excluded from admin v1; infrastructure-only operational control | Not rendered in the admin client | N/A | No admin route, button, or client call is shipped; health remains an external operations concern |

The graph-editor concept in the tracked design authority guides layout and feedback hierarchy only. It does not create permission, status, endpoint, or content authority.
