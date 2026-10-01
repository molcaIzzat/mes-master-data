import { z } from "zod";

/**
 * Canvas geometry for React Flow nodes. `width`/`height` are absent on nodes
 * that were never resized, so the editor falls back to its own default size.
 */
export const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.optional(z.number().check(z.positive())),
  height: z.optional(z.number().check(z.positive())),
});
export type Position = z.infer<typeof positionSchema>;
