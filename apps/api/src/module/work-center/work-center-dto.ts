import * as z from "zod";

import { jsonValidator, paginationSchema, queryValidator } from "@molca/helper";
import { WORK_CENTER_OEE_MODE, WORK_CENTER_TYPE } from "./work-center.js";

const listWorkCenterInputSchema = paginationSchema.extend({
  q: z.pipe(
    z.optional(z.string()),
    z.transform((v) => (v === "" ? undefined : v)),
  ),
  areaId: z.pipe(
    z.optional(z.coerce.number()),
    z.transform((v) => (v === 0 ? undefined : v)),
  ),
  type: z.optional(z.enum(WORK_CENTER_TYPE)),
});

const createWorkCenterSchema = z.object({
  code: z.string().check(z.minLength(5)),
  name: z.string().check(z.minLength(5)),
  areaId: z.number().check(z.positive(), z.int()),
  type: z.enum(WORK_CENTER_TYPE),
  oeeMode: z.enum(WORK_CENTER_OEE_MODE),
  workCenterClassId: z.nullable(z.number().check(z.positive(), z.int())),
  idealRatePerHour: z.pipe(
    z.nullable(z.number().check(z.positive(), z.int())),
    z.transform((v) => (v === null ? null : String(v))),
  ),
});

const updateWorkCenterSchema = createWorkCenterSchema.partial();

const workCenterValidator = {
  paginate: queryValidator(listWorkCenterInputSchema),
  create: jsonValidator(createWorkCenterSchema),
  update: jsonValidator(updateWorkCenterSchema),
};

export { workCenterValidator };
