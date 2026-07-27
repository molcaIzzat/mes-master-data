import * as z from "zod";

import { paginationSchema, queryValidator } from "@molca/helper";

const listLevelConfigurationInputSchema = paginationSchema.extend({
  q: z.pipe(
    z.optional(z.string()),
    z.transform((v) => (v === "" ? undefined : v)),
  ),
  areaId: z.pipe(
    z.optional(z.coerce.number()),
    z.transform((v) => (v === 0 ? undefined : v)),
  ),
});

const levelConfigurationValidator = {
  paginate: queryValidator(listLevelConfigurationInputSchema),
};

export { levelConfigurationValidator };
