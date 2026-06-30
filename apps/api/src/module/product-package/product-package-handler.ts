import { Hono } from "hono";
import { WebResponse } from "@molca/network";

import type { AuthEnv, AuthMiddleware } from "@molca/security";

import { productPackageValidator } from "./product-package-dto.js";

import type { TProductPackageService } from "./product-package-service.js";

type ProductPackageHandlerDeps = {
  productPackageService: TProductPackageService;
  authMw: AuthMiddleware;
};

function createProductPackageHandler({ productPackageService, authMw }: ProductPackageHandlerDeps) {
  const app = new Hono<AuthEnv>();

  app.use("*", authMw);

  app.put("/:id", productPackageValidator.update, async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");
    const resp = await productPackageService.update(parseInt(id), body);
    return c.json(WebResponse.builder<{ id: number }>().data(resp).build(), 200);
  });

  return app;
}

export { createProductPackageHandler };
export type { ProductPackageHandlerDeps };
