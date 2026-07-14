import * as z from "zod";

import { jsonValidator, paginationSchema, queryValidator } from "@molca/helper";

const listAreaInputSchema = paginationSchema.extend({
  q: z.optional(z.string().transform((v) => (v === "" ? undefined : v))),
  siteId: z.optional(z.coerce.number().transform((v) => (v === 0 ? undefined : v))),
});

const createAreaSchema = z.object({
  name: z.string().min(5),
  code: z.string().min(5),
  siteId: z.number(),
});

const updateAreaSchema = createAreaSchema.partial();

const areaValidator = {
  paginate: queryValidator(listAreaInputSchema),
  create: jsonValidator(createAreaSchema),
  update: jsonValidator(updateAreaSchema),
};

export { areaValidator };
