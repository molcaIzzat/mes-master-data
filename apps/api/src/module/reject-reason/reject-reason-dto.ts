import * as z from "zod";

import { jsonValidator, paginationSchema, queryValidator } from "@molca/helper";

const listRejectReasonInputSchema = paginationSchema.extend({
  q: z.pipe(
    z.optional(z.string()),
    z.transform((v) => (v === "" ? undefined : v)),
  ),
  areaId: z.pipe(
    z.optional(z.coerce.number()),
    z.transform((v) => (v === 0 ? undefined : v)),
  ),
  // Same `0 -> undefined` shape as areaId above, and for the same reason: an
  // absent filter and an explicit `?workCenterId=0` must mean the same thing,
  // because `0` is what a caller sends for "nothing selected yet". Filtering on
  // line zero would answer with an EMPTY picker rather than an unfiltered one,
  // which reads as "this line has no reject reasons".
  workCenterId: z.pipe(
    z.optional(z.coerce.number()),
    z.transform((v) => (v === 0 ? undefined : v)),
  ),
});

const rejectReasonSchema = z.object({
  code: z.string().min(5),
  name: z.string().min(5),
});

const createRejectReasonSchema = rejectReasonSchema.extend({
  areaIds: z.array(z.number().check(z.positive(), z.int())).check(z.minLength(1)),
  workCenterIds: z.array(z.number().check(z.positive(), z.int())).check(z.minLength(1)),
  equipmentIds: z.array(z.number().check(z.positive(), z.int())).check(z.minLength(1)),
});

const updateRejectReasonSchema = rejectReasonSchema.partial().extend({
  areaIds: z.optional(z.array(z.number().check(z.positive(), z.int())).check(z.minLength(1))),
  workCenterIds: z.optional(z.array(z.number().check(z.positive(), z.int())).check(z.minLength(1))),
  equipmentIds: z.optional(z.array(z.number().check(z.positive(), z.int())).check(z.minLength(1))),
});

const rejectReasonValidator = {
  paginate: queryValidator(listRejectReasonInputSchema),
  create: jsonValidator(createRejectReasonSchema),
  update: jsonValidator(updateRejectReasonSchema),
};

export { listRejectReasonInputSchema, rejectReasonValidator };
