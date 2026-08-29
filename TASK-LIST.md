# Admin Panel Task List

## Baseline

- [x] Connect the independent Git repository.
- [x] Define ownership, agent rules, workflow contracts, roadmap, and quality baseline.
- [x] Record legacy implementation rejection.
- [x] Publish the greenfield documentation baseline to `origin/main`.
- [x] Accept the React, TypeScript, and Vite architecture.
- [ ] Accept auth, state, editor, testing, and deployment ADRs.
- [ ] Scaffold runtime and CI with locked dependencies.
- [x] Read the tracked frontend design authority and admin graph-editor reference boundary.

## Foundation and access

- [ ] Validate environment and API base configuration.
- [ ] Confirm same-origin reverse-proxy topology before any session client implementation.
- [ ] Generate or verify typed client from the accepted admin OpenAPI (`Docs/03-contracts/OPENAPI-ACCEPTANCE.md`).
- [x] PS-05 accepted admin OpenAPI artifact exists; type generation is unblocked for scaffold foundation work.
- [ ] Implement normalized server, validation, permission, conflict, and network errors.
- [ ] Cover current admin `code/message/fields`, public `detail`, contact `ok/error`, and unknown framework forms according to the central compatibility matrix.
- [ ] Implement sign-in, sign-out, session expiry, CSRF, MFA, and re-authentication.
- [ ] Implement permission-aware shell without treating UI visibility as authorization.
- [ ] Add accessible table, form, dialog, notice, upload, and destructive-action primitives.

## Workflows

- [ ] Dashboard and health/degraded feedback.
- [ ] Content collections, filters, pagination, and bulk archive.
- [ ] Create/edit, locale completeness, rich content, revisions, scheduling, preview, publish.
- [ ] Media upload, metadata, replacement, usage, and deletion protection.
- [ ] Home-module composition and ordering.
- [ ] Timeline editing and validation.
- [ ] Graph node/edge editing and validation.
- [ ] Map each admin workflow to endpoint, method, permission, lifecycle state, error mapping, audit expectation, and acceptance evidence before implementation.
- [ ] Site/profile configuration and contact settings.
- [ ] Rebuild feedback without false success.

## Release evidence

- [ ] Authentication and authorization threat review.
- [ ] Mutation failure, conflict, retry, and duplicate-submit tests.
- [ ] Keyboard, screen-reader, zoom, focus, RTL text-entry, and long-content review.
- [ ] Supported browser and responsive-layout review.
- [ ] Sensitive-data/logging review.
- [ ] E2E test against a disposable backend database.
- [ ] Preview deployment, rollback drill, and owner acceptance.
