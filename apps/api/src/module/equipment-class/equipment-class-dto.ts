import * as z from "zod";

import { jsonValidator, paginationSchema, queryValidator } from "@molca/helper";

const listEquipmentClassInputSchema = paginationSchema.extend({
  q: z.pipe(
    z.optional(z.string()),
    z.transform((v) => (v === "" ? undefined : v)),
  ),
});

const createEquipmentClassSchema = z.object({
  code: z.string().check(z.minLength(3)),
  name: z.string().check(z.minLength(3)),
});

const updateEquipmentClassSchema = createEquipmentClassSchema.partial();

const equipmentClassValidator = {
  paginate: queryValidator(listEquipmentClassInputSchema),
  create: jsonValidator(createEquipmentClassSchema),
  update: jsonValidator(updateEquipmentClassSchema),
};

export { equipmentClassValidator };
