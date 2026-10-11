# PU-25 hermetic full-stack journey — engineering evidence

Date: 2026-09-27. Owner: ADMIN. Coordinator-verified.
Branch: `test/hermetic-admin-journey` (base `main` = `e50fdce`).
Worktree: `D:/Project/.atlas-worktrees/admin-panel-hermetic-journey`.

**Status: implemented and executed green. NOT merged, NOT pushed, NOT deployed.
This is engineering evidence, not owner acceptance and not release readiness.**

## 1. Why the credentialed route was abandoned

`PU-25-admin-journey` was recorded as BLOCKED on owner credentials. That was
incomplete: `tests/e2e/product-journey-live.e2e.ts` also required a live staging
host via `ADMIN_JOURNEY_ADMIN_URL` / `ADMIN_JOURNEY_PUBLIC_URL`, and the owner
deleted staging on 2026-09-26. So the acceptance route was **dead, not pending** —
no credential could have unblocked it. This is recorded in
`Docs/10-tracking/DECISION-LOG.md` (2026-09-27) and as DEBT-005.

The previous evidence was HTTP-mocked component tests, which the existing
handoff itself states is "NOT evidence of live integration, release delivery,
production access, or owner acceptance". This slice replaces that.

## 2. What "hermetic" means here — and what it does not

The journey runs the **real, unmodified backend** — real Django apps, real
middleware, real Ninja routers, real auth/OTP/CSRF/If-Match guards — against a
**disposable SQLite database** in a hermetic root, and serves the **real built
`dist/` admin bundle** through Django's own `serve_admin_ui`.

| Guarantee | How it is enforced |
|---|---|
| The backend repository is never written to | `hermetic_settings.py` lives in the **admin-panel** worktree and is injected via `PYTHONPATH`; no file in `Back-End` changes. Verified: `Back-End` is still clean at `e999737`. |
| No production/staging/developer database is opened | `DATABASES` is redirected to `$HERMETIC_ROOT/db.sqlite3`; `MEDIA_ROOT` and `STATIC_ROOT` likewise. |
| No external product-runner process is dispatched | The settings module `assert`s `REBUILD_TRIGGER_ENABLED is False` and `PUBLICATION_RUNNER_ARGV == []` rather than trusting the import. |
| No owner credential is read, stored or required | Provisioning creates an `@example.invalid` superuser with a published RFC 6238 **test** TOTP secret. |
| Only synthetic records are published | Slugs are marker-derived per run; no real owner content or profile claim is used. |

## 3. The journey — 4/4 green

Run: `npm run test:hermetic` (12.2s). Coordinator re-executed after its own fixes.

```
ok 1 draft -> save with If-Match -> publish -> public rendered content (3.1s)
ok 2 a stale If-Match is rejected with 409 STALE_REVISION (2.7s)
ok 3 media replacement keeps the record and swaps the served bytes (2.6s)
ok 4 restore returns a published record to a draft without losing the public copy (2.8s)
4 passed (12.2s)
```

These are the operations the packet names, exercised through real HTTP against
real backend code — not mocks. Observed in the run log: `POST /auth/login` 401
then 200, `POST /content/article` 201, `POST .../revisions` 201, `PUT` 200,
`POST .../transition` 200, `GET /api/articles/en/{slug}` 200, and
`POST .../revisions/1/restore` 200 with the public payload still served.

## 4. A real defect this journey found and fixed

The journey surfaced a genuine production bug that the mocked tests could not
see, because a mock never rotates a cookie:

**`django.contrib.auth.login` rotates the CSRF secret and re-issues the
`csrftoken` cookie.** The admin client cached the pre-login token, so the first
post-login mutation replayed a stale token and `admin_common._check_csrf`
answered 403 `CSRF_FAILED`. A real user signing in and then saving would hit
this; the unit tests never reproduced it.

Fix (`src/lib/api/auth.ts`, `src/lib/api/client.ts`): a forced-refresh path in
the CSRF provider, an invalidation after login, after logout (now in a `finally`
so a failed logout still clears it), and on any 403 rejection.

The regression test (`src/lib/api/auth.test.ts`) now also asserts that the login

## 5. Gates (coordinator re-run, real output)

| Gate | Result |
|---|---|
| `npm run lint` | **0 errors**, 6 pre-existing `react-refresh` warnings, none in changed files |
| `npx tsc -b` | clean, exit 0 |
| `npm test` | **343 passed** / 61 files (was 341; +2 CSRF regression cases) |
| `npm run test:hermetic` | **4 passed** (12.2s) |

The interrupted run left 6 lint errors in the new spec (`no-explicit-any`, two
unused vars). Those were fixed rather than suppressed: the response type is now
`Record<string, unknown>` — `any` would have silently made every `.code` /
`.message` assertion unchecked and defeated the point of an integration test —
and the unused edit response is now a real assertion that `updatedAt` moved.

## 6. Changed paths

- `tests/e2e/hermetic-journey.e2e.ts` — NEW, the 4-scenario journey
- `playwright.hermetic.config.ts` — NEW, no-mock browser config
- `tests/hermetic/hermetic_settings.py` — NEW, isolated settings overlay
- `tests/hermetic/provision.py` — NEW, synthetic superuser + TOTP
- `tests/hermetic/run-hermetic.mjs` — NEW, ephemeral port/root orchestration
- `src/lib/api/auth.ts` — CSRF invalidation fix
- `src/lib/api/client.ts` — forced-refresh provider + rejection handler
- `src/lib/api/auth.test.ts` — regression coverage
- `package.json` — `test:hermetic` script
- `docs/quality/product-v2/PU-25-HERMETIC-JOURNEY-HANDOFF.md` — this file

## 7. What is still NOT proven

- **Not merged, not pushed, not deployed.** The branch is local only.
- **No owner acceptance and no coordinator disposition.** `PU-25-admin-journey`
  remains BLOCKED in `execution-tasks.json`; closing it is a coordinator
  decision, not this slice's.
- **The public-side render is verified through the public API, not a full static
  rebuild.** The journey asserts `GET /api/articles/{locale}/{slug}` serves the
  published payload and that restore/transition change what is served. It does
  NOT run the production static-rebuild pipeline; the rebuild hook is explicitly
  disabled in the hermetic settings, so this slice cannot and does not claim the
  `PU-07-runner` edge-invalidation path.
- **Atlas authoring is not exercised here.** The journey covers article
  publication, conflicts, media replacement and restore. It does not drive the
  Atlas editor, because the admin bundle in production predates Atlas B.
- **`PU-09-editor` was not re-reviewed in this slice.** The interrupted run did
  not reach it; the StoryEditor revision remains REVISE.

**PU-25-hermetic-journey_HANDOFF_READY** — engineering evidence only.

---

# 8. Adversarial re-review of `PU-09-editor` — 2026-09-27

Coordinator performed this directly, because the agent run for this task died
on an auth error before reaching it. The existing handoff's claims were **not**
taken at face value.

**Verdict: the revision is substantially real, but its `PU-09-editor` claim is
overstated. `PU-09-editor` should stay REVISE.**

## What genuinely holds up

Re-ran the suite: **13 passed** (12 pre-existing + 1 added below). These parts
are real and well covered:

- Schema-driven block forms with required markers, with an honest fallback to
  the `STORY_BLOCK_TYPES` catalog when the schema response is absent — and the
  fallback does not silently relax validation.
- Accessible reorder controls (18 `onKeyDown`/`onClick` handlers, 27
  label/role bindings) — keyboard operation is genuinely implemented, not
  asserted.
- Table cells and media selections are **controlled and replaced on external
  reload**, so a background refetch cannot leave the editor showing stale
  values. This is the kind of bug that usually is not caught.
- Real library search/paging with selections preserved across a library
  **failure**, plus stale-response guarding.
- Validation is a genuine blocker: incomplete required values, typed-value
  errors, schema item bounds, nested required items and duplicate columns all
  block Save. The "Save mine on top" conflict path is correctly disabled while
  validation issues exist — so a conflict can never be resolved by writing
  invalid data over someone else's.

## Finding 1 — MEDIUM — `autosave` is asserted but does not exist

The handoff and the packet both claim "visible autosave/conflict states".

`autosaveState` is a **prop with no mechanism behind it**:

- `StoryEditor.tsx` contains **no `setTimeout`, no `setInterval`, no
  `useEffect`, no debounce** — verified by search across all 932 lines.
- The production parent passes `autosaveState={dirty ? 'dirty' : 'idle'}`
  (`ContentEditPage.tsx:493`). The states `saving` and `saved` are therefore
  **never produced in the real product**.
- The existing test `shows visible autosave, saved, conflict, and error states`
  only `rerender`s the component with a hand-injected `autosaveState="saved"`
  and asserts the string. It proves the component can *print* a prop, not that
  anything ever sets it.

Net effect in production: the status line can only ever read **"Unsaved
changes."** and stays there. The "Autosaving…" and "All changes saved."
strings are unreachable.

The added regression test
(`does not claim autosave when no autosave mechanism exists`) encodes the
truthful current behaviour: no timer may advance the state, and no
autosave claim may be asserted. It passes, which is the finding.

**Required before PU-09-editor can close:** either implement real debounced
autosave (timer + save + `saving`/`saved` transitions + an abort/error path),
or drop `autosave` from the packet and the copy and keep the explicit Save
button as the only persistence path. Shipping the current state advertises a
capability that does not exist.

## Finding 2 — LOW — the mocked journey and the hermetic journey disagree in scope

`src/pages/product-journey.test.tsx` covers media search, draft save +
publish-after-acknowledgment, 409 conflict, backend error and RTL. Those are
legitimate component-level tests and now sit alongside a strictly stronger
hermetic journey. They are not wrong, but they are the weaker artifact and
should not be presented as the acceptance path — which is exactly how the
previous handoff framed them.

## Finding 3 — INFORMATIONAL — the editor is not reachable in production

The production admin image (`prod-507b4bb3`, code `f1cfa37`) predates Atlas B,
so neither the Atlas editor nor this story editor is what an owner currently
sees. Editor quality work is not user-visible until an admin deploy happens.

## What remains NOT proven for PU-09-editor

- No browser visual acceptance, no screenshots, no owner review.
- No Atlas-editor exercise at all (the hermetic journey covers article
  publication, conflicts, media replacement and restore).
- The `saving`/`saved` autosave paths are untested **because they are
  unreachable**, not because they are verified.

**Disposition is a coordinator/owner decision. This review does not accept
PU-09-editor and does not change `execution-tasks.json`.**
POST actually carried the pre-login token, so it cannot pass against a client
that sends no CSRF at all.