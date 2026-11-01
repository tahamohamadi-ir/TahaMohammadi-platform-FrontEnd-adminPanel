# Production deploy (`deploy-production.yml`)

Rebuilds and redeploys **only** the `admin` container (this SPA, served by
nginx at `/admin/`) in the shared `taha-cms-prod` Docker Compose stack on
the production host. `cms`, `web`, `db`, `mailpit` and the shared
`edge-caddy` are never restarted — the existing
`/home/deploy/prod/docker-compose.prod.yml` and Caddy routing are reused
as-is. It is modelled on the public site's workflow of the same name and
uses the same secrets.

- Every push to `main` runs the `verify` job (build, unit tests, e2e) —
  nothing is deployed.
- Deploying requires a manual trigger: **Actions → Deploy production →
  Run workflow**.

## One-time setup (done by the repository owner, not by an agent)

Use the **same values** you already added to the public-site repo. Add
them here under **Settings → Secrets and variables → Actions → New
repository secret** — paste values directly into the GitHub UI, never into
a chat or a file in this repo:

| Secret                 | Value                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| `PROD_SSH_PRIVATE_KEY` | Same as the public site (contents of the deploy private key)                              |
| `PROD_SSH_KNOWN_HOSTS` | Same as the public site (`ssh-keyscan` output)                                            |
| `PROD_SSH_HOST`        | Same as the public site                                                                   |
| `PROD_SSH_PORT`        | Same as the public site                                                                   |
| `PROD_SSH_USER`        | Same as the public site (`deploy`)                                                        |
| `PROD_APP_DIR`         | Same as the public site is fine — this workflow works in its own `admin/` subfolder of it |

Optional but recommended: **Settings → Environments → production →
Required reviewers**, so the deploy pauses for your approval.

## What the workflow does

See `.github/workflows/deploy-production.yml` for the exact steps. In
order, on the server:

1. Checks out the deployed commit into `$PROD_APP_DIR/admin/src`.
2. Builds `taha-admin-prod:prod-<short-sha>` from `deploy/Dockerfile.prod`.
3. Confirms the compose file still resolves `admin` to
   `taha-admin-prod:${RELEASE_ID}`, and stops before changing anything if
   not.
4. Prints the current `RELEASE_ID` (the rollback target) and tags the
   images `cms`, `web` and `admin` are running right now with it, plus
   `cms`/`web`'s with the new release id. `RELEASE_ID` is shared by all
   three app images, so this keeps every service resolvable both after the
   bump and after a rollback (tags only, no content changes).
5. Sets the single `RELEASE_ID=` line in `/home/deploy/.env.prod` (file
   permissions kept at 0600).
6. `docker compose -p taha-cms-prod ... up -d --no-deps --force-recreate admin`.
7. Waits for the new container to serve `/admin/` on its port 8080.

The backend deploy uses the same lock file
(`/home/deploy/.deploy-prod.lock`), so the two never edit `.env.prod` at
the same time.

## `deploy/Dockerfile.prod` vs `Infra/staging/Dockerfile.admin`

The root repo's `Infra/staging/Dockerfile.admin` builds from a combined
multi-repo checkout. This one is the same `node:22-bookworm` build →
`nginx:1.27-alpine` serve, with a single-repo build context;
`deploy/nginx-admin.conf` is a copy of `Infra/staging/nginx-admin.conf`.

## Rollback

The previous image stays on the host. Set `RELEASE_ID=` in
`/home/deploy/.env.prod` back to the "rollback target" value printed in
the run's log and run
`docker compose -p taha-cms-prod --env-file /home/deploy/.env.prod -f /home/deploy/prod/docker-compose.prod.yml up -d --no-deps --force-recreate admin`.
