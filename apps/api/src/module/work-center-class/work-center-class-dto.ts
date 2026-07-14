import * as z from "zod";

import { jsonValidator, paginationSchema, queryValidator } from "@molca/helper";

const listWorkCenterClassInputSchema = paginationSchema.extend({
  q: z.optional(z.string().transform((v) => (v === "" ? undefined : v))),
});

const createWorkCenterClassSchema = z.object({
  code: z.string().min(5),
  name: z.string().min(5),
});

const updateWorkCenterClassSchema = createWorkCenterClassSchema.partial();

const workCenterClassValidator = {
  paginate: queryValidator(listWorkCenterClassInputSchema),
  create: jsonValidator(createWorkCenterClassSchema),
  update: jsonValidator(updateWorkCenterClassSchema),
};

export { workCenterClassValidator };
