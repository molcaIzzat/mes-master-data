import { metrics } from "@opentelemetry/api";

import type { Counter } from "@opentelemetry/api";

// Example custom metric. Resolved lazily so it binds to the real MeterProvider
// installed by the OTel SDK — creating instruments before the SDK starts would
// bind them to the no-op provider permanently.
let commentsCreated: Counter | undefined;

function getcommentsCreatedCounter(): Counter {
  commentsCreated ??= metrics
    .getMeter("core-api")
    .createCounter("comments_created_total", { description: "Total number of comments created" });
  return commentsCreated;
}

let postsCreated: Counter | undefined;

function getPostsCreatedCounter(): Counter {
  postsCreated ??= metrics
    .getMeter("core-api")
    .createCounter("posts_created_total", { description: "Total number of posts created" });
  return postsCreated;
}

export { getcommentsCreatedCounter, getPostsCreatedCounter };
