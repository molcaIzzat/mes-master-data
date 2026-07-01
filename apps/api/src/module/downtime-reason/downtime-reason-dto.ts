import * as z from "zod";

import { paginationSchema, queryValidator } from "@molca/helper";
import { DOWNTIME_REASON_CATEGORY } from "./downtime-reason.js";

const listDowntimeReasonInputSchema = paginationSchema.extend({
  q: z.optional(z.string().transform((v) => (v === "" ? undefined : v))),
  areaId: z.optional(z.coerce.number()),
  category: z.optional(z.enum(DOWNTIME_REASON_CATEGORY)),
});

const downtimeReasonValidator = {
  paginate: queryValidator(listDowntimeReasonInputSchema),
};

export { downtimeReasonValidator };
