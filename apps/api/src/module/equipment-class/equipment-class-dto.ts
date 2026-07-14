import * as z from "zod";

import { jsonValidator, paginationSchema, queryValidator } from "@molca/helper";

const listEquipmentClassInputSchema = paginationSchema.extend({
  q: z.optional(z.string().transform((v) => (v === "" ? undefined : v))),
});

const createEquipmentClassSchema = z.object({
  code: z.string().min(5),
  name: z.string().min(5),
});

const updateEquipmentClassSchema = createEquipmentClassSchema.partial();

const equipmentClassValidator = {
  paginate: queryValidator(listEquipmentClassInputSchema),
  create: jsonValidator(createEquipmentClassSchema),
  update: jsonValidator(updateEquipmentClassSchema),
};

export { equipmentClassValidator };
