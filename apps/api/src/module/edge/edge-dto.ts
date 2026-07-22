import * as z from "zod";

import { jsonValidator } from "@molca/helper";

const createEdgeSchema = z
  .object({
    fromWorkUnitId: z.int().check(z.positive()),
    toWorkUnitId: z.int().check(z.positive()),
  })
  .check(
    z.refine((val) => val.fromWorkUnitId !== val.toWorkUnitId, {
      message: "Cannot connect unit to itself",
      path: ["toWorkUnitId"],
    }),
  );

const edgeValidator = {
  create: jsonValidator(createEdgeSchema),
};

export { edgeValidator };
