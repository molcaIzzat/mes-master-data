ALTER TABLE "ms_core"."equipments" ADD COLUMN "position" jsonb DEFAULT '{"x":0,"y":0}' NOT NULL;--> statement-breakpoint
ALTER TABLE "ms_core"."work_centers" ADD COLUMN "position" jsonb DEFAULT '{"x":0,"y":0}' NOT NULL;--> statement-breakpoint
ALTER TABLE "ms_core"."work_units" ADD COLUMN "position" jsonb DEFAULT '{"x":0,"y":0}' NOT NULL;