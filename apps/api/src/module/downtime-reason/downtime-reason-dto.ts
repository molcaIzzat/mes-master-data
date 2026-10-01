import * as z from "zod";

import { jsonValidator, paginationSchema, queryValidator } from "@molca/helper";
import { DOWNTIME_REASON_CATEGORY } from "./downtime-reason.js";

const listDowntimeReasonInputSchema = paginationSchema.extend({
  q: z.pipe(
    z.optional(z.string()),
    z.transform((v) => (v === "" ? undefined : v)),
  ),
  areaId: z.pipe(
    z.optional(z.coerce.number()),
    z.transform((v) => (v === 0 ? undefined : v)),
  ),
  category: z.optional(z.enum(DOWNTIME_REASON_CATEGORY)),
  // Same `0 -> undefined` shape as areaId above, and for the same reason: an
  // absent filter and an explicit `?workCenterId=0` must mean the same thing,
  // because `0` is what a caller sends for "nothing selected yet".
  workCenterId: z.pipe(
    z.optional(z.coerce.number()),
    z.transform((v) => (v === 0 ? undefined : v)),
  ),
});

const downtimeReasonSchema = z.object({
  code: z.string().check(z.minLength(3)),
  name: z.string().check(z.minLength(3)),
  category: z.enum(DOWNTIME_REASON_CATEGORY),
});

const createDowntimeReasonSchema = downtimeReasonSchema.extend({
  areaIds: z.array(z.number().check(z.positive())).check(z.minLength(1)),
  workCenterIds: z.array(z.number().check(z.positive())).check(z.minLength(1)),
  equipmentIds: z.array(z.number().check(z.positive())).check(z.minLength(1)),
});

const updateDowntimeReasonSchema = downtimeReasonSchema.partial().extend({
  areaIds: z.optional(z.array(z.number().check(z.positive())).check(z.minLength(1))),
  workCenterIds: z.optional(z.array(z.number().check(z.positive())).check(z.minLength(1))),
  equipmentIds: z.optional(z.array(z.number().check(z.positive())).check(z.minLength(1))),
});

const downtimeReasonValidator = {
  paginate: queryValidator(listDowntimeReasonInputSchema),
  create: jsonValidator(createDowntimeReasonSchema),
  update: jsonValidator(updateDowntimeReasonSchema),
};

export { downtimeReasonValidator, listDowntimeReasonInputSchema };
