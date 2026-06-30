CREATE TYPE "ms_core"."product_cycle_time_unit" AS ENUM('BAG_PER_MINUTE', 'SHOT_PER_MINUTE', 'SAK_PER_MINUTE', 'PCS_PER_MINUTE');--> statement-breakpoint
CREATE TYPE "ms_core"."product_packaing_type" AS ENUM('BAG', 'SHOT', 'CALENDER', 'INNER', 'CARTON', 'SAK');--> statement-breakpoint
CREATE TABLE "ms_core"."product_convertions" (
	"id" serial PRIMARY KEY,
	"sort_order" integer NOT NULL,
	"product_id" integer NOT NULL,
	"unit" varchar(100) NOT NULL,
	"value" numeric(15,3) NOT NULL,
	"region" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ms_core"."product_cycle_time_machines" (
	"id" serial PRIMARY KEY,
	"product_id" integer NOT NULL,
	"machine_id" integer NOT NULL,
	"product_code" varchar(100) NOT NULL,
	"machine_code" varchar(100) NOT NULL,
	"cycle_time" numeric(15,3) NOT NULL,
	"cycle_time_unit" "ms_core"."product_cycle_time_unit" NOT NULL,
	"region" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_cycle_time_machines_key" UNIQUE("product_id","machine_id")
);
--> statement-breakpoint
CREATE TABLE "ms_core"."product_packages" (
	"id" serial PRIMARY KEY,
	"product_id" integer NOT NULL,
	"sort_order" integer NOT NULL,
	"package" "ms_core"."product_packaing_type" NOT NULL,
	"main" boolean NOT NULL,
	"std_weight" numeric(10,3) NOT NULL,
	"max_weight" numeric(10,3) NOT NULL,
	"min_weight" numeric(10,3) NOT NULL,
	"length" numeric(10,3) NOT NULL,
	"width" numeric(10,3) NOT NULL,
	"height" numeric(10,3) NOT NULL,
	"vol" numeric(10,3) NOT NULL,
	"region" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ms_core"."products" (
	"id" serial PRIMARY KEY,
	"region" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"code" varchar(100) NOT NULL,
	"name" varchar(100) NOT NULL,
	"cycle_time" numeric(15,3) NOT NULL,
	"cycle_time_unit" "ms_core"."product_cycle_time_unit" NOT NULL,
	"area_id" integer NOT NULL,
	"price" numeric(15,3),
	"cost" numeric(15,3),
	CONSTRAINT "products_code_region_key" UNIQUE("code","region")
);
--> statement-breakpoint
CREATE TABLE "ms_core"."products_lines" (
	"id" serial PRIMARY KEY,
	"product_id" integer NOT NULL,
	"line_id" integer NOT NULL,
	"region" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_line_key" UNIQUE("product_id","line_id")
);
--> statement-breakpoint
ALTER INDEX "ms_core"."areas_region_org_updated_idx" RENAME TO "areas_region_updated_idx";--> statement-breakpoint
ALTER INDEX "ms_core"."lines_region_org_updated_idx" RENAME TO "lines_region_updated_idx";--> statement-breakpoint
ALTER INDEX "ms_core"."machines_region_org_updated_idx" RENAME TO "machines_region_updated_idx";--> statement-breakpoint
ALTER INDEX "ms_core"."sub_machines_region_org_updated_idx" RENAME TO "sub_machines_region_updated_idx";--> statement-breakpoint
CREATE INDEX "product_conversions_region_updated_idx" ON "ms_core"."product_convertions" ("region","updated_at");--> statement-breakpoint
CREATE INDEX "product_cycle_time_machines_region_updated_idx" ON "ms_core"."product_cycle_time_machines" ("region","updated_at");--> statement-breakpoint
CREATE INDEX "products_cycle_time_machines_machine_id_idx" ON "ms_core"."product_cycle_time_machines" ("machine_id");--> statement-breakpoint
CREATE INDEX "products_packages_region_updated_idx" ON "ms_core"."product_packages" ("region","updated_at");--> statement-breakpoint
CREATE INDEX "products_region_updated_idx" ON "ms_core"."products" ("region","updated_at");--> statement-breakpoint
CREATE INDEX "products_area_id_idx" ON "ms_core"."products" ("area_id");--> statement-breakpoint
CREATE INDEX "products_lines_region_updated_idx" ON "ms_core"."products_lines" ("region","updated_at");--> statement-breakpoint
CREATE INDEX "products_lines_product_id_idx" ON "ms_core"."products_lines" ("product_id");--> statement-breakpoint
CREATE INDEX "products_lines_line_id_idx" ON "ms_core"."products_lines" ("line_id");--> statement-breakpoint
ALTER TABLE "ms_core"."product_convertions" ADD CONSTRAINT "product_convertions_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "ms_core"."products"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ms_core"."product_cycle_time_machines" ADD CONSTRAINT "product_cycle_time_machines_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "ms_core"."products"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "ms_core"."product_cycle_time_machines" ADD CONSTRAINT "product_cycle_time_machines_machine_id_machines_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "ms_core"."machines"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ms_core"."product_packages" ADD CONSTRAINT "product_packages_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "ms_core"."products"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ms_core"."products" ADD CONSTRAINT "products_area_id_areas_id_fkey" FOREIGN KEY ("area_id") REFERENCES "ms_core"."areas"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "ms_core"."products_lines" ADD CONSTRAINT "products_lines_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "ms_core"."products"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "ms_core"."products_lines" ADD CONSTRAINT "products_lines_line_id_lines_id_fkey" FOREIGN KEY ("line_id") REFERENCES "ms_core"."lines"("id") ON DELETE RESTRICT;