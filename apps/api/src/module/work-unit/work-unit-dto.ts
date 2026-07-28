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

// Kept apart from the create schemas below so the update schemas can be built
// without their defaults -- see `updateWorkUnitSchema`.
const workUnitFields = {
  code: z.string().check(z.minLength(5)),
  name: z.string().check(z.minLength(5)),
  workCenterId: z.number().check(z.positive(), z.int()),
  workUnitClassId: z.nullable(z.number().check(z.positive(), z.int())),
  isOeeRelevant: z.boolean(),
  isAcquirable: z.boolean(),
  telemetryTags: z.nullable(z.record(z.string(), z.string())),
  type: z.enum(WORK_UNIT_TYPE),
  position: positionSchema,
};

const createWorkUnitSchema = z.object({
  ...workUnitFields,
  // On create, leaving these out means "none".
  workUnitClassId: z._default(workUnitFields.workUnitClassId, null),
  telemetryTags: z._default(workUnitFields.telemetryTags, null),
});

const countPointFields = {
  equipmentId: z.nullable(z.int().check(z.positive())),
  uomId: z.int().check(z.positive()),
  role: z.enum(COUNT_ROLE),
  source: z.enum(COUNT_SOURCE),
  sourceTag: z.string().check(z.minLength(3)),
};

const createCountPointSchema = z.object({
  ...countPointFields,
  source: z._default(countPointFields.source, "plc"),
});

// Cells stay plain strings on the way in. Roles, sources and the codes behind
// equipment and unit are checked during the import itself, so a bad value comes
// back pinned to the row it sits on instead of as one flat field error.
const MAX_IMPORT_ROWS = 1000;

const importCountPointSchema = z.object({
  rows: z
    .array(
      z.object({
        equipmentCode: z.string(),
        unitCode: z.string(),
        role: z.string(),
        source: z.string(),
        sourceTag: z.string(),
      }),
    )
    .check(z.minLength(1), z.maxLength(MAX_IMPORT_ROWS)),
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

// Deliberately NOT `createWorkUnitSchema.partial()`: `.partial()` leaves the
// `_default` wrappers in place and zod still fills them in for a key the body
// never sent, so a PUT carrying only `position` -- which is exactly what a drag
// in the DAG editor sends -- silently blanked the machine's class and telemetry
// tags. Building the update schema off the plain fields keeps a partial body
// partial. The repository writes whatever survives parsing, so anything that
// leaks in here is a column overwritten with a default.
const updateWorkUnitSchema = z.object(workUnitFields).partial();
const updateCountPointSchema = z.object(countPointFields).partial();
const updateProductSpecSchema = createProductSpecSchema.partial();
const updateProductAliasSchema = createProductAliasSchema.partial();

const workUnitValidator = {
  paginate: queryValidator(listWorkUnitInputSchema),
  paginateCP: queryValidator(listCountPointSchema),
  paginateProductSpec: queryValidator(listProductSpecSchema),
  paginateProductAlias: queryValidator(listProductAliasSchema),
  create: jsonValidator(createWorkUnitSchema),
  createCP: jsonValidator(createCountPointSchema),
  importCP: jsonValidator(importCountPointSchema),
  createProductSpec: jsonValidator(createProductSpecSchema),
  createProductAlias: jsonValidator(createProductAliasSchema),
  update: jsonValidator(updateWorkUnitSchema),
  updateCP: jsonValidator(updateCountPointSchema),
  updateProductSpec: jsonValidator(updateProductSpecSchema),
  updateProductAlias: jsonValidator(updateProductAliasSchema),
};

export { workUnitValidator, MAX_IMPORT_ROWS, updateCountPointSchema, updateWorkUnitSchema };
