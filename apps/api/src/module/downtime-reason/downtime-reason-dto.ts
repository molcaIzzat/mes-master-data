import * as z from "zod";

import { jsonValidator, paginationSchema, queryValidator } from "@molca/helper";
import { DOWNTIME_REASON_CATEGORY } from "./downtime-reason.js";

const listDowntimeReasonInputSchema = paginationSchema.extend({
  q: z.optional(z.string().transform((v) => (v === "" ? undefined : v))),
  areaId: z.optional(z.coerce.number().transform((v) => (v === 0 ? undefined : v))),
  category: z.optional(z.enum(DOWNTIME_REASON_CATEGORY)),
});

const downtimeReasonSchema = z.object({
  code: z.string().min(5),
  name: z.string().min(5),
  category: z.enum(DOWNTIME_REASON_CATEGORY),
});

const createDowntimeReasonSchema = downtimeReasonSchema.extend({
  areaIds: z.array(z.number().check(z.positive())).check(z.minLength(1)),
  lineIds: z.array(z.number().check(z.positive())).check(z.minLength(1)),
  machineIds: z.array(z.number().check(z.positive())).check(z.minLength(1)),
});

const updateDowntimeReasonSchema = downtimeReasonSchema.partial().extend({
  areaIds: z.optional(z.array(z.number().check(z.positive())).check(z.minLength(1))),
  lineIds: z.optional(z.array(z.number().check(z.positive())).check(z.minLength(1))),
  machineIds: z.optional(z.array(z.number().check(z.positive())).check(z.minLength(1))),
});

const downtimeReasonValidator = {
  paginate: queryValidator(listDowntimeReasonInputSchema),
  create: jsonValidator(createDowntimeReasonSchema),
  update: jsonValidator(updateDowntimeReasonSchema),
};

export { downtimeReasonValidator };
