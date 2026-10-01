ALTER TABLE "ms_core"."count_points" RENAME COLUMN "uom" TO "uom_id";--> statement-breakpoint
ALTER TABLE "ms_core"."count_points" ALTER COLUMN "uom_id" SET DATA TYPE integer USING "uom_id"::integer;--> statement-breakpoint
ALTER TABLE "ms_core"."count_points" ADD CONSTRAINT "count_points_uom_id_uom_id_fkey" FOREIGN KEY ("uom_id") REFERENCES "ms_core"."uom"("id") ON DELETE RESTRICT;