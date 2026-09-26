# Admin Panel Agent Contract

<!-- PRODUCT-V2.1 -->

Current product work: read `../../Docs/09-decisions/ADR-0010-UNIFIED-EXECUTION-CONTRACTS.md`, `../../Docs/05-delivery/concept-alignment-v2/EXECUTION.md`, and the assigned **ADMIN** leaf packet. New target interfaces live in `../../Docs/03-contracts/PRODUCT-INTERFACES-V2.md`; generated OpenAPI remains current implementation evidence. Old prefix-only task selection and family freezes are superseded for this queue. CA-09–16 must not be dispatched separately.
<!-- /PRODUCT-V2.1 -->

## Read order

1. `README.md`
2. `PROJECT-MANIFEST.md`
3. `../../Docs/00-governance/AUTHORITY-ORDER.md`
4. `../../Docs/03-contracts/AUTH-CONTRACT.md`
5. `../../Docs/03-contracts/API-CONTRACT.md`
6. `../../Docs/03-contracts/ERROR-COMPATIBILITY-MATRIX.md`
7. `../../Docs/references/frontend-design-authority/README.md`
8. `TASK-LIST.md`
9. `../../Docs/05-delivery/MULTI-AGENT-TASK-BOARD.md` (select one active ADMIN packet from execution-tasks.json)

## Rules

- This is a greenfield admin frontend; do not copy `D:\Project\Taha-personal-platform\apps\admin`.
- Never invent permissions, states, endpoints, validation, or publication behavior.
- Use the tracked authority's graph-editor concept only as a visual/behavior reference. Do not infer endpoint fields, permissions, or content from it.
- Do not read `../Assets` as implementation authority; it is ignored local incoming evidence.
- Treat every mutation as pending until the backend confirms it.
- Separate draft, scheduled, published, archived, and failed states visibly.
- Require explicit confirmation for destructive or hard-to-reverse actions.
- Preserve unsaved work and report conflicts; do not silently overwrite revisions.
- Keep credentials and privileged tokens out of source, logs, screenshots, and browser storage unless the accepted auth design explicitly requires safe storage.
- Accessibility applies to all editors, tables, dialogs, graphs, timelines, uploads, and notifications.
- Add tests and handoff evidence with every behavior change.

## Completion evidence

Report changed files, exact checks, affected workflows and permissions, failure-state evidence, screenshots for UI changes, and unresolved risk. A successful HTTP response is not enough if the displayed state is wrong.

<!-- graft:start -->
## Graft — repo context graph

This repo is indexed in `graft/`: small linked markdown nodes that explain each
system and carry exact file:line spans, kept in sync with the code through git.

For ANY task here — understanding how something works, finding where code lives,
or scoping a change — get context from the graph before grepping or opening
source files. Re-ask freely (it's cheap) and reuse literal identifiers you
already have (symbol, error string, file name) as the query. New to this repo?
Run `graft map` first — a token-budgeted orientation (dir clusters, hubs,
hotspots), no LLM, no key.

- Run `graft ask "<your question>" --source` → ranked nodes with the relevant
  code spans inlined (each hit's ≤8-line crux by default; `--full` for whole
  definitions when the crux isn't enough). Match the tool to the task shape:
  for understanding or editing, the top node IS the answer — cite its
  `covers:` file:line spans and edit straight from `--source`. For
  exhaustive tasks ("every occurrence / every caller of this pattern"), ranked
  results are top-N, not complete — run `graft grep "<literal>"` instead
  (exhaustive over indexed files, grouped by enclosing symbol), falling back
  to raw `grep -rn` only for unindexed files.
- `graft skeleton <file>` → every definition's signature + span, ~10× cheaper
  than reading the file; use it to skim an API surface.
- `graft callers <symbol>` gives precomputed, exact edges — who calls this.
  Add `--direction out` for what it calls, or `--depth N` to walk
  transitively for the full blast radius. For structural questions, skip
  ranking and use this directly.
- Or browse: `graft/INDEX.md` lists every node; follow the links.
- Monorepos and folders of multiple repos rank fairly across sub-projects —
  hits carry `[scope/]` labels naming which one they're from. Narrow with
  `graft ask "<task>" --in <scope>/` once you know where you're working.

If a returned span is truncated ("+N more lines"), open the file at that exact
range before finalizing. Only open source files when a node genuinely lacks a
needed detail, and then at the exact file:line the node points to — never
re-read whole files.

After big code changes, refresh the graph with `graft build` (deterministic,
no API key, $0).
<!-- graft:end -->
