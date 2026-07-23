import * as z from "zod";

import { jsonValidator, paginationSchema, queryValidator } from "@molca/helper";
import { WORK_UNIT_TYPE } from "./work-unit.js";

import { positionSchema } from "../../shared/database/helper/common.js";
import { COUNT_ROLE, COUNT_SOURCE } from "../count-point/count-point.js";

const listWorkUnitInputSchema = paginationSchema.extend({
  q: z.pipe(
    z.optional(z.string()),
    z.transform((v) => (v === "" ? undefined : v)),
  ),
  workCenterId: z.pipe(
    z.optional(z.coerce.number()),
    z.transform((v) => (v === 0 ? undefined : v)),
  ),
  type: z.optional(z.enum(WORK_UNIT_TYPE)),
});

const listCountPointSchema = paginationSchema;
const listProductSpecSchema = paginationSchema;
const listProductAliasSchema = paginationSchema;

const createWorkUnitSchema = z.object({
  code: z.string().check(z.minLength(5)),
  name: z.string().check(z.minLength(5)),
  workCenterId: z.number().check(z.positive(), z.int()),
  workUnitClassId: z._default(z.nullable(z.number().check(z.positive(), z.int())), null),
  isOeeRelevant: z.boolean(),
  isAcquirable: z.boolean(),
  telemetryTags: z._default(z.nullable(z.record(z.string(), z.string())), null),
  type: z.enum(WORK_UNIT_TYPE),
  position: positionSchema,
});

const createCountPointSchema = z.object({
  equipmentId: z.nullable(z.int().check(z.positive())),
  uomId: z.int().check(z.positive()),
  role: z.enum(COUNT_ROLE),
  source: z._default(z.enum(COUNT_SOURCE), "plc"),
  sourceTag: z.string().check(z.minLength(3)),
});

const createProductSpecSchema = z.object({
  productId: z.number().check(z.positive(), z.int()),
  uomId: z.number().check(z.positive(), z.int()),
  idealRatePerHour: z.pipe(
    z.number().check(z.positive(), z.int(), z.gte(1)),
    z.transform((val) => String(val)),
  ),
});

const createProductAliasSchema = z.object({
  productId: z.number().check(z.positive(), z.int()),
  equipmentId: z.number().check(z.positive(), z.int()),
  externalCode: z.string().check(z.minLength(1)),
});

const updateWorkUnitSchema = createWorkUnitSchema.partial();
const updateCountPointSchema = createCountPointSchema.partial();
const updateProductSpecSchema = createProductSpecSchema.partial();
const updateProductAliasSchema = createProductAliasSchema.partial();

const workUnitValidator = {
  paginate: queryValidator(listWorkUnitInputSchema),
  paginateCP: queryValidator(listCountPointSchema),
  paginateProductSpec: queryValidator(listProductSpecSchema),
  paginateProductAlias: queryValidator(listProductAliasSchema),
  create: jsonValidator(createWorkUnitSchema),
  createCP: jsonValidator(createCountPointSchema),
  createProductSpec: jsonValidator(createProductSpecSchema),
  createProductAlias: jsonValidator(createProductAliasSchema),
  update: jsonValidator(updateWorkUnitSchema),
  updateCP: jsonValidator(updateCountPointSchema),
  updateProductSpec: jsonValidator(updateProductSpecSchema),
  updateProductAlias: jsonValidator(updateProductAliasSchema),
};

export { workUnitValidator };
