import * as z from "zod";

import { jsonValidator, paginationSchema, queryValidator } from "@molca/helper";

const listRejectReasonInputSchema = paginationSchema.extend({
  q: z.optional(z.string().transform((v) => (v === "" ? undefined : v))),
  areaId: z.optional(z.coerce.number().transform((v) => (v === 0 ? undefined : v))),
});

const rejectReasonSchema = z.object({
  code: z.string().min(5),
  name: z.string().min(5),
});

const createRejectReasonSchema = rejectReasonSchema.extend({
  areaIds: z.array(z.number().check(z.positive())).check(z.minLength(1)),
  lineIds: z.array(z.number().check(z.positive())).check(z.minLength(1)),
  machineIds: z.array(z.number().check(z.positive())).check(z.minLength(1)),
});

const updateRejectReasonSchema = rejectReasonSchema.partial().extend({
  areaIds: z.optional(z.array(z.number().check(z.positive())).check(z.minLength(1))),
  lineIds: z.optional(z.array(z.number().check(z.positive())).check(z.minLength(1))),
  machineIds: z.optional(z.array(z.number().check(z.positive())).check(z.minLength(1))),
});

const rejectReasonValidator = {
  paginate: queryValidator(listRejectReasonInputSchema),
  create: jsonValidator(createRejectReasonSchema),
  update: jsonValidator(updateRejectReasonSchema),
};

export { rejectReasonValidator };
