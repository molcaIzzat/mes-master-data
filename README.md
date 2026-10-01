# template-api-with-bff

A production-shaped **Vite+ pnpm monorepo** template: a React SPA behind a Backend-for-Frontend
that owns auth, in front of a **modular-monolith** domain API backed by PostgreSQL. Use it as a
starting point for new services — see [Using this as a template](#using-this-as-a-template).

## Architecture

```
            browser
               │  (same-origin: /api, /health)
        ┌──────▼───────┐        ┌──────────────┐        ┌────────────────────────────┐
        │     web      │  proxy │     bff      │  proxy │            api             │
        │ React SPA    │───────▶│ Hono :3001   │───────▶│ Hono :3002  (modular        │──▶ PostgreSQL
        │ nginx :80    │        │ OIDC + cookie│ +bearer│ monolith) JWT-protected     │
        └──────────────┘        └──────┬───────┘        │  ┌────────┐    ┌──────────┐ │
                                       │ OIDC            │  │  post  │───▶│ comment  │ │
                                  ┌────▼────┐            │  │ module │ in │  module  │ │
                                  │  IdP    │            │  └────────┘proc└──────────┘ │
                                  │(Keycloak)│           └────────────────────────────┘
                                  └─────────┘
```

- **`web`** — React 19 + Tailwind + TanStack Query. Static build; talks to the BFF same-origin.
- **`bff`** — Hono. OIDC login, httpOnly session cookie, and a hardened proxy that injects the
  bearer token toward `api`.
- **`api`** — Hono + Drizzle/PostgreSQL. JWT-protected domain API (`/api/v1/*`). A **modular
  monolith**: the `post` and `comment` domains live as separate modules in one process and one DB.
  Modules talk through the **`@molca/contract-client`** interface, never each other's internals —
  e.g. `post` enriches a post with its comments by calling the in-process `CommentClient`
  (an impl of `CommentClientContract`). Swapping that impl for an HTTP one later splits a module
  into its own service with no changes on the caller's side.

Each app has its own README with env vars and details:
[`apps/web`](apps/web/README.md) · [`apps/bff`](apps/bff/README.md) ·
[`apps/api`](apps/api/README.md).

## Prerequisites

- **Node** `>=22.12.0`
- **pnpm** `11.8.0` — `corepack enable` (pinned via `packageManager`)
- **[Vite+](https://viteplus.dev)** — the `vp` CLI, installed automatically by `pnpm install`
- For full local runtime: a **PostgreSQL** database and an **OIDC** client (Keycloak)

## Quickstart

```bash
pnpm install            # or: vp install

# run everything (web :3000, bff :3001, api :3002)
pnpm dev:all

# or run one app
pnpm dev:web            # vp run web#dev
pnpm dev:bff            # vp run bff#dev
pnpm dev:api            # vp run api#dev
```

Configure each app's `.env` first (copy the committed examples and fill in OIDC / DB / cookie
values). Then open http://localhost:3000.

## Onboarding: from zero to running locally

The step-by-step version of the quickstart above, for a developer setting this repo up for the
first time.

This service owns the ISA-95 hierarchy (areas, lines / work centers, machines / work units), SKUs and
downtime / reject reasons. **mes-oee-monitor, mes-schedule-maintenance and mes-job-schedule all read
from it over HTTP**, so you may need it running locally even when you work on one of those — see
[step 7](#7-running-it-as-the-upstream-for-the-other-mes-repos).

### 1. Prerequisites

| Tool / access               | Version / detail                                                                   | Check                   |
| --------------------------- | ---------------------------------------------------------------------------------- | ----------------------- |
| **Node.js**                 | `>=22.12.0`                                                                        | `node -v`               |
| **pnpm**                    | `11.17.0`, pinned via `packageManager` — run `corepack enable` once                | `pnpm -v`               |
| **Git + SSH key on GitHub** | Your key must have read access to `molca-id/mes-shared` (the `@molca/mes` package) | `ssh -T git@github.com` |
| **Docker**                  | For a local Postgres and the optional observability stack                          | `docker version`        |
| **Keycloak access**         | A realm plus a client — ask the team lead for the values (see below)               | —                       |
| `psql` _(optional)_         | Handy for inspecting the database                                                  | `psql --version`        |

The [Vite+](https://viteplus.dev) `vp` CLI is a dev dependency — `pnpm install` brings it, nothing
to install globally.

**Keycloak client you need:** a _confidential_ client (normally `mes-master-data`) with
`http://localhost:3001/api/callback` registered as a Valid Redirect URI. The BFF uses it for login;
the api only verifies incoming tokens against the realm.

### 2. Clone and install

```bash
git clone <repo-url> mes-master-data    # SSH URL from GitHub
cd mes-master-data
corepack enable
pnpm install
pnpm --filter "./packages/*" run build   # build the shared @molca/* packages once
```

The last line matters on a fresh checkout: `packages/*` export from their `dist/`, which is
gitignored, so `pnpm dev:api` / `pnpm dev:bff` and `vp check` cannot resolve `@molca/*` until it
has been built. Re-run it after pulling changes to a package.

If `pnpm install` fails on `git+ssh://git@github.com/molca-id/mes-shared.git`, your SSH key either
is not loaded (`ssh-add -l`) or has no access to that repo — ask for access before going further.

### 3. Start a local Postgres

```bash
docker run -d --name master-data-pg \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=mes-master-data \
  -p 5432:5432 postgres:18-alpine
```

Port `5432` already taken (for example by another MES repo's database)? Map another one
(`-p 55433:5432`) and use it in the URL below.

### 4. Create the `.env` files

```bash
cp apps/api/.env.example apps/api/.env
cp apps/bff/.env.example apps/bff/.env
```

Then fill in at least:

| File            | Variable                                                          | Value                                                         |
| --------------- | ----------------------------------------------------------------- | ------------------------------------------------------------- |
| `apps/api/.env` | `DATABASE_URL`                                                    | `postgres://postgres:postgres@localhost:5432/mes-master-data` |
| `apps/api/.env` | `OIDC_HOST`, `OIDC_BASE_URI`, `OIDC_TOKEN_URI`, `KEYCLOAK_REALMS` | Your realm                                                    |
| `apps/api/.env` | `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`                            | Your client                                                   |
| `apps/bff/.env` | `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_BASE_URI`           | Your client and realm                                         |
| `apps/bff/.env` | `COOKIE_SECRET`                                                   | Output of `openssl rand -base64 32`                           |

Everything else in the examples already works for local development. Leave `AUTH_AUDIENCE` and
`AUTH_ALLOWED_AZP` unset. `REGION_CODE` must be the same value the calling services use (`ap3` by
default), or they will not see these rows. `.env` files are gitignored — never commit them.

### 5. Apply the schema

Migrations are generated by Drizzle and live in `apps/api/src/shared/database/migration/`. The
Drizzle config reads `DATABASE_URL` from the environment, so export it first:

```bash
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/mes-master-data
pnpm --filter api db:push      # runs drizzle-kit migrate
```

It is safe to re-run. When you change `src/shared/database/schema/schema.ts`, generate a new
migration with `pnpm --filter api db:gen` and commit it.

### 6. Start the apps

```bash
pnpm dev:all        # web :3000, bff :3001, api :3002
# or, one per terminal:
pnpm dev:api
pnpm dev:bff
pnpm dev:web
```

Check that it works:

- `curl http://localhost:3002/health/readiness` reports the database and Keycloak as up.
- <http://localhost:3000> sends you to the Keycloak login, then to `/level-configuration`.
- `pnpm run ready` passes (check + test + build).

A fresh database is empty — create an area, a line and its machines from the Level Configuration
page (or ask the team for a dump of the dev database) before the other MES repos have anything to
show.

### 7. Running it as the upstream for the other MES repos

The other repos' apis also listen on `:3002` and expect master-data at
**`MASTER_DATA_BASE_URL=http://localhost:4002`**. So when master-data is only there to serve them:

1. In `apps/api/.env`, set `PORT=4002`.
2. Run just the api: `pnpm dev:api`.
3. If you also want this repo's own UI at the same time, set `CORE_API_BASE_URL=http://localhost:4002`
   in `apps/bff/.env` — and note its web (:3000) and bff (:3001) will collide with the other repo's,
   so run them one at a time.

### Troubleshooting

| Symptom                                        | Likely cause                                                                  |
| ---------------------------------------------- | ----------------------------------------------------------------------------- |
| `db:push` fails with a missing / invalid URL   | `DATABASE_URL` is not exported in the shell you ran it from (step 5).         |
| Port already in use                            | A stale dev server, or another MES repo on the same port — see step 7.        |
| api refuses to boot listing a missing variable | A required `.env` value is empty; compare with `.env.example`.                |
| Another repo gets 404 from `/v1/areas`         | Its `MASTER_DATA_BASE_URL` points at its own api on `:3002`, not at this one. |
| Another repo's pickers are empty               | No records yet, or `REGION_CODE` differs between the two services.            |
| Keycloak shows "Invalid redirect URI"          | `OIDC_REDIRECT_URI` is not registered on the client exactly as written.       |

## Common commands

| Command                                        | What it does                              |
| ---------------------------------------------- | ----------------------------------------- |
| `vp install`                                   | Install workspace dependencies            |
| `vp check`                                     | Format + lint + type-check the whole repo |
| `vp run -r test`                               | Run tests in every package                |
| `vp run -r build`                              | Build every package                       |
| `vp run ready`                                 | `check` + test + build (pre-push gate)    |
| `pnpm --filter <app> run <check\|test\|build>` | Run a task for one app                    |

## Docker

Each app has a multi-stage `Dockerfile` (built **from the repo root** — the build needs the
workspace lockfile). Server images run as non-root on `node:22-alpine` with production deps only;
the web image is nginx serving static assets + proxying to the BFF.

```bash
docker build -f apps/api/Dockerfile -t template-api .
docker build -f apps/bff/Dockerfile -t template-bff .
docker build -f apps/web/Dockerfile -t template-web .
```

Run them together with the bundled compose file (uses each app's `.env`, optional):

```bash
docker compose up --build      # web :8080 -> bff :3001 -> api :3002
```

> Database migrations are not run by the images. Apply them separately:
> `pnpm --filter api db:push`.

## CI/CD & Docker Hub

Per-app GitHub Actions workflows live in `.github/workflows/` (`api.yaml`, `bff.yaml`,
`web.yaml`). Each runs, on PRs and pushes to `main` (path-filtered to that app):

```
install-deps ──▶ check ─┐
             ├▶ test  ─┼▶ release-image   (web has no test job)
             └▶ build ─┘
```

`check` / `test` / `build` run in parallel; **`release-image`** runs only on push to `main` (and
manual `workflow_dispatch`), after the others pass, and builds + pushes the image to Docker Hub.

### Required secrets & variables — release-image fails until these are set

`release-image` **will fail at the Docker login step** until you add, in
**Settings → Secrets and variables → Actions**:

| Type     | Name                  | Value                                                       |
| -------- | --------------------- | ----------------------------------------------------------- |
| Secret   | `DOCKERHUB_USERNAME`  | Your Docker Hub username                                    |
| Secret   | `DOCKERHUB_TOKEN`     | A Docker Hub **access token** (Account Settings → Security) |
| Variable | `DOCKERHUB_NAMESPACE` | Docker Hub namespace (user/org) for the image names         |

Images are published as `${DOCKERHUB_NAMESPACE}/template-<app>`, tagged `latest` and the short git
SHA. The `check`/`test`/`build` jobs need no secrets and pass out of the box.

## Using this as a template

This repo is meant to be a **GitHub template repository**.

1. **Enable it** (once, on this repo): **Settings → General → check "Template repository."** A green
   **"Use this template"** button then appears on the repo home.
2. **Create a new project from it:** click **Use this template → Create a new repository**, or with
   the CLI:
   ```bash
   gh repo create my-org/my-service --template molca-id/boilerplate-hono-bff --private
   ```

**What you get** (template ≠ fork): a brand-new repository with a single fresh commit and **no
shared git history** or upstream link — you can't open PRs back to this template, and it won't
receive its updates. Things that are **not** copied and must be set up in the new repo:

- **Secrets & variables** — re-add `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, `DOCKERHUB_NAMESPACE`.
- **Branch protection rules** and other repo settings.
- `.env` files (gitignored) — recreate them with your own OIDC / DB / cookie values.

**After creating**, typically: rename packages/images as needed, fill in `.env` for each app, set
the Docker Hub secrets/variable, and update these READMEs for your service.

## Vite+

This monorepo uses [Vite+](https://viteplus.dev) (`vp`). Run `vp help`, or read the local docs in
`node_modules/vite-plus/docs`. If setup/runtime looks wrong, run `vp env doctor`.
