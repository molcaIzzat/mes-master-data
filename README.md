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
