import * as z from "zod";

import { jsonValidator, paginationSchema, queryValidator } from "@molca/helper";

const listEquipmentInputSchema = paginationSchema.extend({
  q: z.pipe(
    z.optional(z.string()),
    z.transform((v) => (v === "" ? undefined : v)),
  ),
});

const createEquipmentSchema = z.object({
  code: z.string().check(z.minLength(5)),
  name: z.string().check(z.minLength(5)),
  workUnitId: z.number().check(z.positive(), z.int()),
  equipmentClassId: z.nullable(z.number().check(z.positive(), z.int())),
  productSignalTag: z.string().check(z.minLength(3)),
});

const updateEquipmentSchema = createEquipmentSchema.partial();

const equipmentValidator = {
  paginate: queryValidator(listEquipmentInputSchema),
  create: jsonValidator(createEquipmentSchema),
  update: jsonValidator(updateEquipmentSchema),
};

export { equipmentValidator };
