import { asFunction, type AwilixContainer } from "awilix";
import { createAuthMiddleware, createKeycloakJwks, bearerToken } from "@molca/security";
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
      }),
    ).singleton(),
  });
}

export { registerInfra };
