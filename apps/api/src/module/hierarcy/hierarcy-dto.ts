import * as z from "zod";

import { jsonValidator, paginationSchema, queryValidator } from "@molca/helper";
import { LINE_CATEGORY } from "../line/line.js";

const listLineHierarcyInputSchema = paginationSchema.extend({
  q: z.optional(z.string().transform((v) => (v === "" ? undefined : v))),
  areaId: z.optional(z.coerce.number()),
});

const createMachineSchema = z.object({
  code: z.string().min(5),
  name: z.string().min(5),
  isMain: z.boolean(),
});

const createSubMachineSchema = z.object({
  code: z.string().min(5),
  name: z.string().min(5),
});

const createLineSchema = z.object({
  code: z.string().min(5),
  name: z.string().min(5),
  areaId: z.number().check(z.positive()),
  category: z.enum(LINE_CATEGORY),
});

const createLineWithMachineSchema = createLineSchema.extend({
  machines: z.array(createMachineSchema),
});

const createMachinesSchema = z.object({
  machines: z.array(createMachineSchema).check(z.minLength(1)),
});

const createSubMachinesSchema = z.object({
  machines: z.array(createSubMachineSchema).check(z.minLength(1)),
});

const hierarcyValidator = {
  paginateLineHierarcy: queryValidator(listLineHierarcyInputSchema),
  createLine: jsonValidator(createLineWithMachineSchema),
  createMachines: jsonValidator(createMachinesSchema),
  createSubMachines: jsonValidator(createSubMachinesSchema),
};

export { hierarcyValidator };
