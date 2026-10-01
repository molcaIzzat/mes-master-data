# web

React 19 SPA (Vite + Tailwind CSS + TanStack Query + axios). It implements the "My Post" UI and
talks to the `bff` **same-origin** via relative `/api` and `/health` paths — so the browser sends
the httpOnly session cookie automatically. Axios auto-refreshes the session on `401`
(`POST /api/token/refresh`) and replays the request.

- **Dev port:** `3000`
- **Build output:** static files in `dist/` (served by nginx in production)

## Prerequisites

- Node `>=22.12.0`, pnpm `11.8.0` (via `corepack enable`)
- A running `bff` (and `core-api`) for live data

## How it reaches the BFF

- **Dev:** the Vite dev server proxies `/api` + `/health` to the BFF. Override the target with the
  `BFF_URL` env var (default `http://localhost:3001`) — see `vite.config.ts`.
- **Prod:** the build is static and uses **relative** URLs. The nginx image (below) serves the SPA
  and reverse-proxies `/api` + `/health` to the BFF at `BFF_UPSTREAM`.

## Local development

```bash
pnpm install      # from the repo root
pnpm dev:web      # or: vp run web#dev   ->   http://localhost:3000
```

## Checks, build

```bash
pnpm --filter web run check    # format + lint + types
pnpm --filter web run build    # tsc -b && vp build -> dist/
pnpm --filter web run preview  # preview the production build
```

> No automated tests yet — the `web` CI workflow intentionally omits a `test` job.

## Docker

Built from the **repo root**. The runtime is `nginx:alpine` serving the static build + proxying to
the BFF:

```bash
docker build -f apps/web/Dockerfile -t template-web .
docker run --rm -p 8080:80 -e BFF_UPSTREAM=http://host.docker.internal:3001 template-web
# open http://localhost:8080
```

- `BFF_UPSTREAM` (default `http://bff:3001`) is substituted into the nginx config at container
  start. The proxy config lives in `apps/web/deploy/nginx.conf.template`; the SPA fallback serves
  `index.html` for client-side routes.
- Final image is small (static assets only — no Node runtime).

CI: `.github/workflows/web.yaml`. The `release-image` job pushes to Docker Hub and **requires the
`DOCKERHUB_*` secrets/variable** documented in the [root README](../../README.md#cicd--docker-hub).
