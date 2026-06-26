CREATE SCHEMA "ms_core";
--> statement-breakpoint
CREATE TYPE "ms_core"."line_cat" AS ENUM('PACKAGE', 'BULK');--> statement-breakpoint
CREATE TABLE "ms_core"."areas" (
	"id" serial PRIMARY KEY,
	"region" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"factory_id" integer,
	"name" varchar NOT NULL,
	"display_name" varchar(255),
	CONSTRAINT "areas_name_region_key" UNIQUE("name","region")
);
--> statement-breakpoint
CREATE TABLE "ms_core"."lines" (
	"id" serial PRIMARY KEY,
	"region" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"code" varchar(100) NOT NULL,
	"name" varchar(100) NOT NULL,
	"area_id" integer NOT NULL,
	"category" "ms_core"."line_cat" NOT NULL,
	CONSTRAINT "lines_code_region_key" UNIQUE("code","region")
);
--> statement-breakpoint
CREATE TABLE "ms_core"."machines" (
	"id" serial PRIMARY KEY,
	"region" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"code" varchar(100) NOT NULL,
	"name" varchar(100) NOT NULL,
	"line_id" integer NOT NULL,
	"is_main" boolean NOT NULL,
	CONSTRAINT "machines_code_region_key" UNIQUE("code","region")
);
--> statement-breakpoint
CREATE TABLE "ms_core"."sub_machines" (
	"id" serial PRIMARY KEY,
	"region" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"code" varchar(100) NOT NULL,
	"name" varchar(100) NOT NULL,
	"machine_id" integer NOT NULL,
	CONSTRAINT "sub_machines_code_region_key" UNIQUE("code","region")
);
--> statement-breakpoint
CREATE INDEX "areas_region_org_updated_idx" ON "ms_core"."areas" ("region","updated_at");--> statement-breakpoint
CREATE INDEX "areas_factory_id_idx" ON "ms_core"."areas" ("factory_id");--> statement-breakpoint
CREATE INDEX "lines_region_org_updated_idx" ON "ms_core"."lines" ("region","updated_at");--> statement-breakpoint
CREATE INDEX "lines_area_id_idx" ON "ms_core"."lines" ("area_id");--> statement-breakpoint
CREATE INDEX "machines_region_org_updated_idx" ON "ms_core"."machines" ("region","updated_at");--> statement-breakpoint
CREATE INDEX "machines_line_id_idx" ON "ms_core"."machines" ("line_id");--> statement-breakpoint
CREATE INDEX "sub_machines_region_org_updated_idx" ON "ms_core"."sub_machines" ("region","updated_at");--> statement-breakpoint
CREATE INDEX "sub_machines_machine_id_idx" ON "ms_core"."sub_machines" ("machine_id");--> statement-breakpoint
ALTER TABLE "ms_core"."lines" ADD CONSTRAINT "lines_area_id_areas_id_fkey" FOREIGN KEY ("area_id") REFERENCES "ms_core"."areas"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "ms_core"."machines" ADD CONSTRAINT "machines_line_id_lines_id_fkey" FOREIGN KEY ("line_id") REFERENCES "ms_core"."lines"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "ms_core"."sub_machines" ADD CONSTRAINT "sub_machines_machine_id_machines_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "ms_core"."machines"("id") ON DELETE RESTRICT;