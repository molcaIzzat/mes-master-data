import * as z from "zod";

import { jsonValidator, paginationSchema, queryValidator } from "@molca/helper";

const listEnterpriseInputSchema = paginationSchema.extend({
  q: z.pipe(
    z.optional(z.string()),
    z.transform((v) => (v === "" ? undefined : v)),
  ),
});

const createEnterpriseSchema = z.object({
  code: z.string().check(z.minLength(2)),
  name: z.string().check(z.minLength(2)),
});

const updateEnterpriseSchema = createEnterpriseSchema.partial();

const enterpriseValidator = {
  paginate: queryValidator(listEnterpriseInputSchema),
  create: jsonValidator(createEnterpriseSchema),
  update: jsonValidator(updateEnterpriseSchema),
};

export { enterpriseValidator };
