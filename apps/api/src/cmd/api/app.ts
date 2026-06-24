import { startOtel } from "@molca/observability";
import { PgInstrumentation } from "@opentelemetry/instrumentation-pg";

// Start the OTel SDK before anything else loads so instrumentation can patch
// modules. In prod this is a no-op (already started by --import instrumentation.mjs).
// Postgres instrumentation is app-specific, so it is passed in here.
startOtel({ instrumentations: [new PgInstrumentation()] });

import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { httpInstrumentationMiddleware } from "@hono/otel";

import type { ContentfulStatusCode } from "hono/utils/http-status";

import { createContainer } from "../container/container.js";
import { loadConfig } from "../../shared/config/config.js";
import { createHealthHandler } from "../../module/health/health-handler.js";
import { createCommentHandler } from "../../module/comment/comment-handler.js";
import { createPostHandler } from "../../module/post/post-handler.js";
import { mapDomainError } from "@molca/helper";
import { observability, baseLogger, getRequestContext } from "@molca/observability";
import { serializeError } from "@molca/utils";
import { WebResponse } from "@molca/network";

const config = loadConfig();
const container = createContainer(config);

const app = new Hono();

app.use("*", httpInstrumentationMiddleware());
app.use("*", observability());
app.use(
  "*",
  cors({
    origin: config.cors.allowedOrigins,
  }),
);

app.route(
  "/health",
  createHealthHandler({
    keycloakProbe: container.resolve("keycloakProbe"),
    postgresProbe: container.resolve("postgresProbe"),
  }),
);

const api = new Hono().basePath("/api/v1");

api.route(
  "/posts",
  createPostHandler({
    authMw: container.resolve("authMw"),
    postService: container.resolve("postService"),
  }),
);

api.route(
  "/comments",
  createCommentHandler({
    authMw: container.resolve("authMw"),
    commentService: container.resolve("commentService"),
  }),
);

app.route("/", api);

app.notFound((c) => {
  return c.json(WebResponse.builder<string>().error("not found page").build(), 404);
});

app.onError(async (err, c) => {
  const mapped = mapDomainError(err);
  if (mapped !== null) {
    const errRes = mapped.getResponse();
    const errMessage: string = await errRes.text();
    const errStatus: ContentfulStatusCode = errRes.status as ContentfulStatusCode;
    return c.json(WebResponse.builder<string>().error(errMessage).build(), errStatus);
  }

  const log = getRequestContext()?.logger ?? baseLogger;
  log.withMetadata({ err: serializeError(err) }).error("internal_server_error");
  return c.json(WebResponse.builder<string>().error("internal server error").build(), 500);
});

export { container };
export default app;
