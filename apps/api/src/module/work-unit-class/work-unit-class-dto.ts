import * as z from "zod";

import { jsonValidator, paginationSchema, queryValidator } from "@molca/helper";

const listWorkUnitClassInputSchema = paginationSchema.extend({
  q: z.optional(z.string().transform((v) => (v === "" ? undefined : v))),
});

const createWorkUnitClassSchema = z.object({
  code: z.string().min(5),
  name: z.string().min(5),
});

const updateWorkUnitClassSchema = createWorkUnitClassSchema.partial();

const workUnitClassValidator = {
  paginate: queryValidator(listWorkUnitClassInputSchema),
  create: jsonValidator(createWorkUnitClassSchema),
  update: jsonValidator(updateWorkUnitClassSchema),
};

export { workUnitClassValidator };
