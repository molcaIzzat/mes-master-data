import * as z from "zod";

import { jsonValidator, paginationSchema, queryValidator } from "@molca/helper";
import { WORK_UNIT_TYPE } from "./work-unit.js";

import { positionSchema } from "../../shared/database/helper/common.js";

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

const createWorkUnitSchema = z.object({
  code: z.string().check(z.minLength(5)),
  name: z.string().check(z.minLength(5)),
  workCenterId: z.number().check(z.positive(), z.int()),
  type: z.enum(WORK_UNIT_TYPE),
  position: positionSchema,
});

const updateWorkUnitSchema = createWorkUnitSchema.partial();

const workUnitValidator = {
  paginate: queryValidator(listWorkUnitInputSchema),
  create: jsonValidator(createWorkUnitSchema),
  update: jsonValidator(updateWorkUnitSchema),
};

export { workUnitValidator };
