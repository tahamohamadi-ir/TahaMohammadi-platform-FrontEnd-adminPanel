# Admin Panel Agent Contract

## Read order

1. `README.md`
2. `PROJECT-MANIFEST.md`
3. `../../Docs/00-governance/AUTHORITY-ORDER.md`
4. `../../Docs/03-contracts/AUTH-CONTRACT.md`
5. `../../Docs/03-contracts/API-CONTRACT.md`
6. `TASK-LIST.md`

## Rules

- This is a greenfield admin frontend; do not copy `D:\Project\Taha-personal-platform\apps\admin`.
- Never invent permissions, states, endpoints, validation, or publication behavior.
- Treat every mutation as pending until the backend confirms it.
- Separate draft, scheduled, published, archived, and failed states visibly.
- Require explicit confirmation for destructive or hard-to-reverse actions.
- Preserve unsaved work and report conflicts; do not silently overwrite revisions.
- Keep credentials and privileged tokens out of source, logs, screenshots, and browser storage unless the accepted auth design explicitly requires safe storage.
- Accessibility applies to all editors, tables, dialogs, graphs, timelines, uploads, and notifications.
- Add tests and handoff evidence with every behavior change.

## Completion evidence

Report changed files, exact checks, affected workflows and permissions, failure-state evidence, screenshots for UI changes, and unresolved risk. A successful HTTP response is not enough if the displayed state is wrong.
