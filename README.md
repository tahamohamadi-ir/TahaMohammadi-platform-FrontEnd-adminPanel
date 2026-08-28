# Taha Mohammadi Platform — Admin Panel

Greenfield administration frontend for the platform CMS. This repository is independent from the public site and backend. The legacy admin UI may be inspected for workflow coverage, but its implementation must not be copied.

## Current state

- Repository governance and delivery baseline: ready.
- Runtime scaffold: pending implementation; the accepted baseline is React, TypeScript, and Vite, while authentication details still require an ADR.
- Canonical contracts: `../../Docs/` in the local workspace.
- Execution plan: [ROADMAP.md](ROADMAP.md) and [TASK-LIST.md](TASK-LIST.md).

The panel must make publication state, locale completeness, validation, permissions, destructive actions, revision history, and backend errors explicit. It must never imply that a save, publish, rebuild, upload, or schedule operation succeeded without server confirmation.
