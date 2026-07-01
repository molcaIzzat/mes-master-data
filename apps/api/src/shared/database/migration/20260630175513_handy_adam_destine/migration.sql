CREATE SCHEMA "ms_downtime";
--> statement-breakpoint
CREATE SCHEMA "ms_reject";
--> statement-breakpoint
CREATE TYPE "ms_downtime"."downtime_cat" AS ENUM('PLANNED', 'UNPLANNED', 'SMALL_STOP');--> statement-breakpoint
CREATE TABLE "ms_downtime"."downtime_reasons_areas" (
	"id" serial PRIMARY KEY,
	"reason_id" integer NOT NULL,
	"area_id" integer NOT NULL,
	"region" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "downtime_reasons_areas_key" UNIQUE("reason_id","area_id")
);
--> statement-breakpoint
CREATE TABLE "ms_downtime"."downtime_reasons_lines" (
	"id" serial PRIMARY KEY,
	"reason_id" integer NOT NULL,
	"line_id" integer NOT NULL,
	"region" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "downtime_reasons_lines_key" UNIQUE("reason_id","line_id")
);
--> statement-breakpoint
CREATE TABLE "ms_downtime"."downtime_reasons_machines" (
	"id" serial PRIMARY KEY,
	"reason_id" integer NOT NULL,
	"machine_id" integer NOT NULL,
	"region" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "downtime_reasons_machines_key" UNIQUE("reason_id","machine_id")
);
--> statement-breakpoint
CREATE TABLE "ms_downtime"."downtime_reasons" (
	"id" serial PRIMARY KEY,
	"region" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"code" varchar(100) NOT NULL,
	"name" varchar(100) NOT NULL,
	"category" "ms_downtime"."downtime_cat" NOT NULL,
	CONSTRAINT "downtime_reasons_code_region_key" UNIQUE("code","region")
);
--> statement-breakpoint
CREATE INDEX "downtime_reasons_areas_region_updated_idx" ON "ms_downtime"."downtime_reasons_areas" ("region","updated_at");--> statement-breakpoint
CREATE INDEX "downtime_reasons_areas_area_id_idx" ON "ms_downtime"."downtime_reasons_areas" ("area_id");--> statement-breakpoint
CREATE INDEX "downtime_reasons_areas_reason_id_idx" ON "ms_downtime"."downtime_reasons_areas" ("reason_id");--> statement-breakpoint
CREATE INDEX "downtime_reasons_lines_region_updated_idx" ON "ms_downtime"."downtime_reasons_lines" ("region","updated_at");--> statement-breakpoint
CREATE INDEX "downtime_reasons_lines_line_id_idx" ON "ms_downtime"."downtime_reasons_lines" ("line_id");--> statement-breakpoint
CREATE INDEX "downtime_reasons_lines_reason_id_idx" ON "ms_downtime"."downtime_reasons_lines" ("reason_id");--> statement-breakpoint
CREATE INDEX "downtime_reasons_machines_region_updated_idx" ON "ms_downtime"."downtime_reasons_machines" ("region","updated_at");--> statement-breakpoint
CREATE INDEX "downtime_reasons_machines_machine_id_idx" ON "ms_downtime"."downtime_reasons_machines" ("machine_id");--> statement-breakpoint
CREATE INDEX "downtime_reasons_machines_reason_id_idx" ON "ms_downtime"."downtime_reasons_machines" ("reason_id");--> statement-breakpoint
CREATE INDEX "downtime_reasons_region_updated_idx" ON "ms_downtime"."downtime_reasons" ("region","updated_at");--> statement-breakpoint
ALTER TABLE "ms_downtime"."downtime_reasons_areas" ADD CONSTRAINT "downtime_reasons_areas_reason_id_downtime_reasons_id_fkey" FOREIGN KEY ("reason_id") REFERENCES "ms_downtime"."downtime_reasons"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ms_downtime"."downtime_reasons_lines" ADD CONSTRAINT "downtime_reasons_lines_reason_id_downtime_reasons_id_fkey" FOREIGN KEY ("reason_id") REFERENCES "ms_downtime"."downtime_reasons"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ms_downtime"."downtime_reasons_machines" ADD CONSTRAINT "downtime_reasons_machines_reason_id_downtime_reasons_id_fkey" FOREIGN KEY ("reason_id") REFERENCES "ms_downtime"."downtime_reasons"("id") ON DELETE CASCADE;