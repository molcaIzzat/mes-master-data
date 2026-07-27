import { Hono } from "hono";
import { WebResponse } from "@molca/network";

import type { AuthEnv, AuthMiddleware } from "@molca/security";

import { levelConfigurationValidator } from "./level-configuration-dto.js";

import type { TLevelConfigurationService } from "./level-configuration-service.js";
import type { LevelLine } from "./level-configuration.js";

type LevelConfigurationHandlerDeps = {
  levelConfigurationService: TLevelConfigurationService;
  authMw: AuthMiddleware;
};

function createLevelConfigurationHandler({
  levelConfigurationService,
  authMw,
}: LevelConfigurationHandlerDeps) {
  const app = new Hono<AuthEnv>();

  app.use("*", authMw);

  app.get("/", levelConfigurationValidator.paginate, async (c) => {
    const { page, size, q, areaId } = c.req.valid("query");
    const filter = {
      q,
      areaId,
    };
    const { items, meta } = await levelConfigurationService.findAll(page, size, filter);
    return c.json(WebResponse.builder<LevelLine[]>().data(items).meta(meta).build(), 200);
  });

  return app;
}

export { createLevelConfigurationHandler };
export type { LevelConfigurationHandlerDeps };
