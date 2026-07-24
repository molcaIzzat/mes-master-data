import * as z from "zod";

import { jsonValidator, paginationSchema, queryValidator } from "@molca/helper";

const listUomInputSchema = paginationSchema.extend({
  q: z.pipe(
    z.optional(z.string()),
    z.transform((v) => (v === "" ? undefined : v)),
  ),
});

const createUomSchema = z.object({
  code: z.string().check(z.minLength(3)),
  name: z.string().check(z.minLength(3)),
});

const updateUomSchema = createUomSchema.partial();

const uomValidator = {
  paginate: queryValidator(listUomInputSchema),
  create: jsonValidator(createUomSchema),
  update: jsonValidator(updateUomSchema),
};

export { uomValidator };
