import type { AuthEnv, AuthMiddleware } from "@molca/security";
import type { TProductService } from "./product-service.js";
import { Hono } from "hono";
import { productValidator } from "./product-dto.js";
import { WebResponse } from "@molca/network";
import type { Product, ProductList } from "./product.js";

type ProductHandlerDeps = {
  productService: TProductService;
  authMw: AuthMiddleware;
};

function createProductHandler({ productService, authMw }: ProductHandlerDeps) {
  const app = new Hono<AuthEnv>();

  app.use("*", authMw);

  app.get("/", productValidator.paginate, async (c) => {
    const { page, size, q, areaId } = c.req.valid("query");
    const filter = {
      q,
      areaId,
    };
    const { items, meta } = await productService.findAll(page, size, filter);
    return c.json(WebResponse.builder<ProductList[]>().data(items).meta(meta).build(), 200);
  });

  app.post("/", productValidator.create, async (c) => {
    const input = c.req.valid("json");
    const resp = await productService.create(input);
    return c.json(WebResponse.builder<{ id: number }>().data(resp).build(), 201);
  });

  app.get("/:id", async (c) => {
    const id = c.req.param("id");
    const resp = await productService.findById(parseInt(id));
    return c.json(WebResponse.builder<Product>().data(resp).build(), 200);
  });

  return app;
}

export { createProductHandler };
export type { ProductHandlerDeps };
