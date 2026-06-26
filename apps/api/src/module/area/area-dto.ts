import * as z from "zod";

import { jsonValidator, paginationSchema, queryValidator } from "@molca/helper";

const listAreaInputSchema = paginationSchema.extend({
  q: z.optional(z.string().transform((v) => (v === "" ? undefined : v))),
  factoryId: z.optional(z.coerce.number()),
});

const createAreaSchema = z.object({
  name: z.string().min(5),
  displayName: z.string().min(5),
  factoryId: z.number().nullable(),
});

const updateAreaSchema = createAreaSchema.partial();

const areaValidator = {
  paginate: queryValidator(listAreaInputSchema),
  create: jsonValidator(createAreaSchema),
  update: jsonValidator(updateAreaSchema),
};

export { areaValidator };
