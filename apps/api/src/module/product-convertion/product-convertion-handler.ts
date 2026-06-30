import { Hono } from "hono";
import { WebResponse } from "@molca/network";

import type { AuthEnv, AuthMiddleware } from "@molca/security";

import { productConvertionValidator } from "./product-convertion-dto.js";

import type { TProductConvertionService } from "./product-convertion-service.js";

type ProductConvertionHandlerDeps = {
  productConvertionService: TProductConvertionService;
  authMw: AuthMiddleware;
};

function createProductConvertionHandler({
  productConvertionService,
  authMw,
}: ProductConvertionHandlerDeps) {
  const app = new Hono<AuthEnv>();

  app.use("*", authMw);

  app.put("/:id", productConvertionValidator.update, async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");
    const resp = await productConvertionService.update(parseInt(id), body);
    return c.json(WebResponse.builder<{ id: number }>().data(resp).build(), 200);
  });

  return app;
}

export { createProductConvertionHandler };
export type { ProductConvertionHandlerDeps };
