import * as z from "zod";

import { jsonValidator, paginationSchema, queryValidator } from "@molca/helper";

const listWorkCenterClassInputSchema = paginationSchema.extend({
  q: z.pipe(
    z.optional(z.string()),
    z.transform((v) => (v === "" ? undefined : v)),
  ),
});

const createWorkCenterClassSchema = z.object({
  code: z.string().check(z.minLength(3)),
  name: z.string().check(z.minLength(3)),
});

const updateWorkCenterClassSchema = createWorkCenterClassSchema.partial();

const workCenterClassValidator = {
  paginate: queryValidator(listWorkCenterClassInputSchema),
  create: jsonValidator(createWorkCenterClassSchema),
  update: jsonValidator(updateWorkCenterClassSchema),
};

export { workCenterClassValidator };
