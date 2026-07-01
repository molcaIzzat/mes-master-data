import * as z from "zod";

import { jsonValidator, paginationSchema, queryValidator } from "@molca/helper";

const listDowntimeActionInputSchema = paginationSchema.extend({
  q: z.optional(z.string().transform((v) => (v === "" ? undefined : v))),
});

const createDowntimeActionSchema = z.object({
  code: z.string().min(5),
  name: z.string().min(5),
  color: z.string(),
});

const updateDowntimeActionSchema = createDowntimeActionSchema.partial();

const downtimeActionValidator = {
  paginate: queryValidator(listDowntimeActionInputSchema),
  create: jsonValidator(createDowntimeActionSchema),
  update: jsonValidator(updateDowntimeActionSchema),
};

export { downtimeActionValidator };
