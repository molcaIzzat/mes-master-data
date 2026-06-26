import * as z from "zod";

import { jsonValidator, paginationSchema, queryValidator } from "@molca/helper";

const listMachineInputSchema = paginationSchema.extend({
  q: z.optional(z.string().transform((v) => (v === "" ? undefined : v))),
  lineId: z.optional(z.coerce.number()),
  isMain: z.optional(z.boolean()),
});

const listSubMachineInputSchema = paginationSchema.extend({
  q: z.optional(z.string().transform((v) => (v === "" ? undefined : v))),
});

const createMachineSchema = z.object({
  code: z.string().min(5),
  name: z.string().min(5),
  lineId: z.number(),
  isMain: z.boolean(),
});

const createSubMachineSchema = z.object({
  code: z.string().min(5),
  name: z.string().min(5),
});

const updateMachineSchema = createMachineSchema.partial();
const updateSubMachineSchema = createSubMachineSchema.partial();

const machineValidator = {
  paginate: queryValidator(listMachineInputSchema),
  paginateSub: queryValidator(listSubMachineInputSchema),
  create: jsonValidator(createMachineSchema),
  createSub: jsonValidator(createSubMachineSchema),
  update: jsonValidator(updateMachineSchema),
  updateSub: jsonValidator(updateSubMachineSchema),
};

export { machineValidator };
