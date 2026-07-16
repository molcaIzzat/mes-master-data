import { z } from "zod";

/** Canvas position for React Flow nodes. */
export const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
});
export type Position = z.infer<typeof positionSchema>;
