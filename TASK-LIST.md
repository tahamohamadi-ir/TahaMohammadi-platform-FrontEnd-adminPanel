# Admin Panel Task List

## Baseline

- [x] Connect the independent Git repository.
- [x] Define ownership, agent rules, workflow contracts, roadmap, and quality baseline.
- [x] Record legacy implementation rejection.
- [x] Publish the greenfield documentation baseline to `origin/main`.
- [x] Accept the React, TypeScript, and Vite architecture.
- [ ] Accept auth, state, editor, testing, and deployment ADRs.
- [ ] Scaffold runtime and CI with locked dependencies.

## Foundation and access

- [ ] Validate environment and API base configuration.
- [ ] Generate or verify typed client from accepted admin OpenAPI.
- [ ] Implement normalized server, validation, permission, conflict, and network errors.
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
