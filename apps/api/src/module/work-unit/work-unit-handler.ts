import { Hono } from "hono";
import { WebResponse } from "@molca/network";

import type { AuthEnv, AuthMiddleware } from "@molca/mes";

import { workUnitValidator } from "./work-unit-dto.js";

import type { TWorkUnitService } from "./work-unit-service.js";
import type { WorkUnit, WorkUnitList } from "./work-unit.js";

import { CountPointImportError } from "../count-point/count-point-errors.js";
import { OtherPointImportError } from "../other-point/other-point-errors.js";

import type { TCountPointService } from "../count-point/count-point-service.js";
import type {
  CountPoint,
  CountPointList,
  ImportCountPointIssue,
  ImportCountPointResult,
} from "../count-point/count-point.js";
import type { TOtherPointService } from "../other-point/other-point-service.js";
import type {
  OtherPoint,
  OtherPointList,
  ImportOtherPointIssue,
  ImportOtherPointResult,
} from "../other-point/other-point.js";
import type { TProductSpecService } from "../product-work-unit-spec/spec-service.js";
import type { ProductSpec, ProductSpecList } from "../product-work-unit-spec/spec.js";
import type { TProductAliasService } from "../product-alias/product-alias-service.js";
import type { ProductAlias, ProductAliasList } from "../product-alias/product-alias.js";

// Mirrors the BadRequestPayload shape the shared validator already returns, so
// the client reads every failure the same way.
type ImportCountPointFailure = {
  message: string;
  issues: ImportCountPointIssue[];
};

type ImportOtherPointFailure = {
  message: string;
  issues: ImportOtherPointIssue[];
};

type WorkUnitHandlerDeps = {
  workUnitService: TWorkUnitService;
  countPointService: TCountPointService;
  otherPointService: TOtherPointService;
  productSpecService: TProductSpecService;
  productAliasService: TProductAliasService;
  authMw: AuthMiddleware;
};

function createWorkUnitHandler({
  workUnitService,
  countPointService,
  otherPointService,
  productSpecService,
  productAliasService,
  authMw,
}: WorkUnitHandlerDeps) {
  const app = new Hono<AuthEnv>();

  app.use("*", authMw);

  app.get("/", workUnitValidator.paginate, async (c) => {
    const { page, size, q, workCenterId, type, ids } = c.req.valid("query");
    const filter = {
      q,
      workCenterId,
      type,
      ids,
    };
    const { items, meta } = await workUnitService.findAll(page, size, filter);
    return c.json(WebResponse.builder<WorkUnitList[]>().data(items).meta(meta).build(), 200);
  });

  app.get("/:id/count-points", workUnitValidator.paginateCP, async (c) => {
    const workUnitId = c.req.param("id");
    const { page, size } = c.req.valid("query");
    const { items, meta } = await countPointService.findManyByWorkUnitId(
      parseInt(workUnitId),
      page,
      size,
    );
    return c.json(WebResponse.builder<CountPointList[]>().data(items).meta(meta).build(), 200);
  });

  app.get("/:id/other-points", workUnitValidator.paginateOP, async (c) => {
    const workUnitId = c.req.param("id");
    const { page, size } = c.req.valid("query");
    const { items, meta } = await otherPointService.findManyByWorkUnitId(
      parseInt(workUnitId),
      page,
      size,
    );
    return c.json(WebResponse.builder<OtherPointList[]>().data(items).meta(meta).build(), 200);
  });

  app.get("/:id/product-specs", workUnitValidator.paginateProductSpec, async (c) => {
    const workUnitId = c.req.param("id");
    const { page, size } = c.req.valid("query");
    const { items, meta } = await productSpecService.findManyByWorkUnitId(
      parseInt(workUnitId),
      page,
      size,
    );
    return c.json(WebResponse.builder<ProductSpecList[]>().data(items).meta(meta).build(), 200);
  });

  app.get("/:id/product-aliases", workUnitValidator.paginateProductAlias, async (c) => {
    const workUnitId = c.req.param("id");
    const { page, size } = c.req.valid("query");
    const { items, meta } = await productAliasService.findManyByWorkUnitId(
      parseInt(workUnitId),
      page,
      size,
    );
    return c.json(WebResponse.builder<ProductAliasList[]>().data(items).meta(meta).build(), 200);
  });

  app.post("/", workUnitValidator.create, async (c) => {
    const body = c.req.valid("json");
    const response = await workUnitService.create({ ...body });
    return c.json(WebResponse.builder<{ id: number }>().data(response).build(), 201);
  });

  app.post("/:id/count-points", workUnitValidator.createCP, async (c) => {
    const workUnitId = c.req.param("id");
    const body = c.req.valid("json");
    const response = await countPointService.create({ ...body, workUnitId: parseInt(workUnitId) });
    return c.json(WebResponse.builder<{ id: number }>().data(response).build(), 201);
  });

  // The only handler that catches: the whole point of an import is telling the
  // user which rows failed and why, and the shared error path can only carry a
  // single string. Everything other than a rejected file still falls through to
  // app.onError.
  app.post("/:id/count-points/import", workUnitValidator.importCP, async (c) => {
    const workUnitId = c.req.param("id");
    const { rows } = c.req.valid("json");
    try {
      const response = await countPointService.importMany(parseInt(workUnitId), rows);
      return c.json(WebResponse.builder<ImportCountPointResult>().data(response).build(), 200);
    } catch (err) {
      if (err instanceof CountPointImportError) {
        return c.json(
          WebResponse.builder<ImportCountPointFailure>()
            .error(err.message)
            .data({ message: err.message, issues: err.issues })
            .build(),
          422,
        );
      }
      throw err;
    }
  });

  app.post("/:id/other-points", workUnitValidator.createOP, async (c) => {
    const workUnitId = c.req.param("id");
    const body = c.req.valid("json");
    const response = await otherPointService.create({ ...body, workUnitId: parseInt(workUnitId) });
    return c.json(WebResponse.builder<{ id: number }>().data(response).build(), 201);
  });

  // Same contract as the count-point import above, and rejected the same way:
  // every offending cell comes back at once and nothing is written.
  app.post("/:id/other-points/import", workUnitValidator.importOP, async (c) => {
    const workUnitId = c.req.param("id");
    const { rows } = c.req.valid("json");
    try {
      const response = await otherPointService.importMany(parseInt(workUnitId), rows);
      return c.json(WebResponse.builder<ImportOtherPointResult>().data(response).build(), 200);
    } catch (err) {
      if (err instanceof OtherPointImportError) {
        return c.json(
          WebResponse.builder<ImportOtherPointFailure>()
            .error(err.message)
            .data({ message: err.message, issues: err.issues })
            .build(),
          422,
        );
      }
      throw err;
    }
  });

  app.post("/:id/product-specs", workUnitValidator.createProductSpec, async (c) => {
    const workUnitId = c.req.param("id");
    const body = c.req.valid("json");
    const response = await productSpecService.create({ ...body, workUnitId: parseInt(workUnitId) });
    return c.json(WebResponse.builder<{ id: number }>().data(response).build(), 201);
  });

  app.post("/:id/product-aliases", workUnitValidator.createProductAlias, async (c) => {
    const workUnitId = c.req.param("id");
    const body = c.req.valid("json");
    const response = await productAliasService.create({
      ...body,
      workUnitId: parseInt(workUnitId),
    });
    return c.json(WebResponse.builder<{ id: number }>().data(response).build(), 201);
  });

  app.get("/:id", async (c) => {
    const id = c.req.param("id");
    const response = await workUnitService.findById(parseInt(id));
    return c.json(WebResponse.builder<WorkUnit>().data(response).build(), 200);
  });

  app.get("/:id/count-points/:cpId", async (c) => {
    const { cpId } = c.req.param();
    const response = await countPointService.findById(parseInt(cpId));
    return c.json(WebResponse.builder<CountPoint>().data(response).build(), 200);
  });

  app.get("/:id/other-points/:opId", async (c) => {
    const { opId } = c.req.param();
    const response = await otherPointService.findById(parseInt(opId));
    return c.json(WebResponse.builder<OtherPoint>().data(response).build(), 200);
  });

  app.get("/:id/product-specs/:specId", async (c) => {
    const { specId } = c.req.param();
    const response = await productSpecService.findById(parseInt(specId));
    return c.json(WebResponse.builder<ProductSpec>().data(response).build(), 200);
  });

  app.get("/:id/product-aliases/:aliasId", async (c) => {
    const { aliasId } = c.req.param();
    const response = await productAliasService.findById(parseInt(aliasId));
    return c.json(WebResponse.builder<ProductAlias>().data(response).build(), 200);
  });

  app.put("/:id", workUnitValidator.update, async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");
    const response = await workUnitService.update(parseInt(id), body);
    return c.json(WebResponse.builder<{ id: number }>().data(response).build(), 200);
  });

  app.put("/:id/count-points/:cpId", workUnitValidator.updateCP, async (c) => {
    const { cpId } = c.req.param();
    const body = c.req.valid("json");
    const response = await countPointService.update(parseInt(cpId), body);
    return c.json(WebResponse.builder<{ id: number }>().data(response).build(), 200);
  });

  app.put("/:id/other-points/:opId", workUnitValidator.updateOP, async (c) => {
    const { opId } = c.req.param();
    const body = c.req.valid("json");
    const response = await otherPointService.update(parseInt(opId), body);
    return c.json(WebResponse.builder<{ id: number }>().data(response).build(), 200);
  });

  app.put("/:id/product-specs/:specId", workUnitValidator.updateProductSpec, async (c) => {
    const { specId } = c.req.param();
    const body = c.req.valid("json");
    const response = await productSpecService.update(parseInt(specId), body);
    return c.json(WebResponse.builder<{ id: number }>().data(response).build(), 200);
  });

  app.put("/:id/product-aliases/:aliasId", workUnitValidator.updateProductAlias, async (c) => {
    const { aliasId } = c.req.param();
    const body = c.req.valid("json");
    const response = await productAliasService.update(parseInt(aliasId), body);
    return c.json(WebResponse.builder<{ id: number }>().data(response).build(), 200);
  });

  app.delete("/:id", async (c) => {
    const id = c.req.param("id");
    const deleted = await workUnitService.delete(parseInt(id));
    return c.json(WebResponse.builder<string>().data(deleted).build(), 200);
  });

  app.delete("/:id/count-points/:cpId", async (c) => {
    const { cpId } = c.req.param();
    const deleted = await countPointService.delete(parseInt(cpId));
    return c.json(WebResponse.builder<string>().data(deleted).build(), 200);
  });

  app.delete("/:id/other-points/:opId", async (c) => {
    const { opId } = c.req.param();
    const deleted = await otherPointService.delete(parseInt(opId));
    return c.json(WebResponse.builder<string>().data(deleted).build(), 200);
  });

  app.delete("/:id/product-specs/:specId", async (c) => {
    const { specId } = c.req.param();
    const deleted = await productSpecService.delete(parseInt(specId));
    return c.json(WebResponse.builder<string>().data(deleted).build(), 200);
  });

  app.delete("/:id/product-aliases/:aliasId", async (c) => {
    const { aliasId } = c.req.param();
    const deleted = await productAliasService.delete(parseInt(aliasId));
    return c.json(WebResponse.builder<string>().data(deleted).build(), 200);
  });

  return app;
}

export { createWorkUnitHandler };
export type { WorkUnitHandlerDeps, ImportCountPointFailure, ImportOtherPointFailure };
