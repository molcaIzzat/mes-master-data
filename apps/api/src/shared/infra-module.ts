import { asFunction, type AwilixContainer } from "awilix";
import { createAuthMiddleware, createKeycloakJwks, bearerToken } from "@molca/mes";
import type { AppConfig } from "./config/config.js";
import { createPostgresDb } from "./database/postgres.js";

function registerInfra(container: AwilixContainer, config: AppConfig) {
  container.register({
    db: asFunction(() =>
      createPostgresDb({
        connectionString: config.database.url,
        max: config.database.maxConnection,
        connectionTimeoutMillis: config.database.connectTimeoutMs,
        idleTimeoutMillis: config.database.idleTimeoutMs,
      }),
    )
      .singleton()
      .disposer((conn) => conn.$client.end()),
    authMw: asFunction(() =>
      createAuthMiddleware({
        issuer: config.oidc.baseUri,
        getKey: createKeycloakJwks(config.oidc.baseUri),
        getToken: bearerToken(),
        // Both undefined unless an operator sets AUTH_AUDIENCE /
        // AUTH_ALLOWED_AZP, in which case this reproduces the previous
        // signature-issuer-expiry-only behaviour exactly. See config.ts for the
        // rollout order — enabling `audience` before the realm has an audience
        // mapper 401s every caller, browser sessions included.
        audience: config.auth.audience,
        allowedAzp: config.auth.allowedAzp,
      }),
    ).singleton(),
  });
}

export { registerInfra };
