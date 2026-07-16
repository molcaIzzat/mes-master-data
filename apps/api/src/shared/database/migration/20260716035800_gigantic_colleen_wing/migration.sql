CREATE SCHEMA "ms_core";
--> statement-breakpoint
CREATE SCHEMA "ms_downtime";
--> statement-breakpoint
CREATE SCHEMA "ms_reject";
--> statement-breakpoint
CREATE TYPE "ms_core"."count_role" AS ENUM('infeed', 'good_output', 'reject');--> statement-breakpoint
CREATE TYPE "ms_core"."count_source" AS ENUM('plc', 'manual');--> statement-breakpoint
CREATE TYPE "ms_downtime"."downtime_cat" AS ENUM('PLANNED', 'UNPLANNED', 'SMALL_STOP');--> statement-breakpoint
CREATE TYPE "ms_core"."oee_mode" AS ENUM('continuous', 'batch', 'discrete', 'none');--> statement-breakpoint
CREATE TYPE "ms_core"."work_center_type" AS ENUM('production_line', 'process_cell', 'production_unit', 'storage_zone');--> statement-breakpoint
CREATE TYPE "ms_core"."work_unit_type" AS ENUM('work_cell', 'unit', 'storage_unit');--> statement-breakpoint
CREATE TABLE "ms_core"."areas" (
	"id" serial PRIMARY KEY,
	"region" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"code" varchar(100) NOT NULL,
	"name" varchar(100) NOT NULL,
	"site_id" integer NOT NULL,
	CONSTRAINT "areas_code_region_key" UNIQUE("code","region")
);
--> statement-breakpoint
CREATE TABLE "ms_downtime"."downtime_actions" (
	"id" serial PRIMARY KEY,
	"region" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"code" varchar(100) NOT NULL,
	"name" varchar(100) NOT NULL,
	"color" varchar(10) NOT NULL,
	CONSTRAINT "downtime_actions_code_region_key" UNIQUE("code","region")
);
--> statement-breakpoint
CREATE TABLE "ms_downtime"."downtime_reasons_areas" (
	"id" serial PRIMARY KEY,
	"reason_id" integer NOT NULL,
	"area_id" integer NOT NULL,
	"region" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dra_key" UNIQUE("reason_id","area_id")
);
--> statement-breakpoint
CREATE TABLE "ms_downtime"."downtime_reasons_equipments" (
	"id" serial PRIMARY KEY,
	"reason_id" integer NOT NULL,
	"equipment_id" integer NOT NULL,
	"region" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dre_key" UNIQUE("reason_id","equipment_id")
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
	CONSTRAINT "dr_code_region_key" UNIQUE("code","region")
);
--> statement-breakpoint
CREATE TABLE "ms_downtime"."downtime_reasons_work_centers" (
	"id" serial PRIMARY KEY,
	"reason_id" integer NOT NULL,
	"work_center_id" integer NOT NULL,
	"region" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "drwc_key" UNIQUE("reason_id","work_center_id")
);
--> statement-breakpoint
CREATE TABLE "ms_core"."equipment_classes" (
	"id" serial PRIMARY KEY,
	"region" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"code" varchar(100) NOT NULL,
	"name" varchar(100) NOT NULL,
	CONSTRAINT "ec_code_region_key" UNIQUE("code","region")
);
--> statement-breakpoint
CREATE TABLE "ms_core"."equipment_flows" (
	"id" serial PRIMARY KEY,
	"work_center_id" integer NOT NULL,
	"from_equipment_id" integer NOT NULL,
	"to_equipment_id" integer NOT NULL,
	"region" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ef_equipment_keys" UNIQUE("from_equipment_id","to_equipment_id"),
	CONSTRAINT "ef_no_self_loop" CHECK (from_equipment_id <> to_equipment_id)
);
--> statement-breakpoint
CREATE TABLE "ms_core"."equipments" (
	"id" serial PRIMARY KEY,
	"region" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"code" varchar(100) NOT NULL,
	"name" varchar(100) NOT NULL,
	"work_unit_id" integer NOT NULL,
	"parent_equipment_id" integer,
	"equipmentClassId" integer,
	"is_oee_relevant" boolean DEFAULT true NOT NULL,
	"is_acuirable" boolean DEFAULT true NOT NULL,
	"telemetry_tags" jsonb,
	CONSTRAINT "equipments_code_region_key" UNIQUE("code","region"),
	CONSTRAINT "equipments_not_own_parent_ckx" CHECK (parent_equipment_id IS DISTINCT FROM id)
);
--> statement-breakpoint
CREATE TABLE "ms_core"."oee_count_points" (
	"id" serial PRIMARY KEY,
	"equipment_id" integer NOT NULL,
	"role" "ms_core"."count_role" NOT NULL,
	"uom" varchar(100) NOT NULL,
	"source" "ms_core"."count_source" DEFAULT 'plc'::"ms_core"."count_source" NOT NULL,
	"source_tag" varchar(255) NOT NULL,
	"region" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_ocp_eq_role_tag" UNIQUE("equipment_id","role","source_tag"),
	CONSTRAINT "ck_ocp_source_tag" CHECK (
    (source = 'plc'    AND source_tag IS NOT NULL) OR
    (source = 'manual' AND source_tag IS NULL)
  )
);
--> statement-breakpoint
CREATE TABLE "ms_core"."product_code_aliases" (
	"id" serial PRIMARY KEY,
	"equipment_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"external_code" text NOT NULL,
	CONSTRAINT "pca_external_key" UNIQUE("equipment_id","external_code")
);
--> statement-breakpoint
CREATE TABLE "ms_core"."product_convertions" (
	"id" serial PRIMARY KEY,
	"sort_order" integer NOT NULL,
	"product_id" integer NOT NULL,
	"uom_id" integer NOT NULL,
	"factor_to_base" numeric(15,3) NOT NULL,
	"region" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pconv_product_uom_key" UNIQUE("product_id","uom_id"),
	CONSTRAINT "pconv_pconv_ftb_cx" CHECK (factor_to_base > 0)
);
--> statement-breakpoint
CREATE TABLE "ms_core"."product_equipment_specs" (
	"id" serial PRIMARY KEY,
	"product_id" integer NOT NULL,
	"equipment_id" integer NOT NULL,
	"uom_id" integer NOT NULL,
	"ideal_rate_per_hour" numeric(15,3) NOT NULL,
	"region" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pes_equipment_key" UNIQUE("product_id","equipment_id")
);
--> statement-breakpoint
CREATE TABLE "ms_core"."product_packages" (
	"id" serial PRIMARY KEY,
	"product_id" integer NOT NULL,
	"sort_order" integer NOT NULL,
	"uom_id" integer NOT NULL,
	"main" boolean NOT NULL,
	"std_weight" numeric(10,3),
	"max_weight" numeric(10,3),
	"min_weight" numeric(10,3),
	"length" numeric(10,3),
	"width" numeric(10,3),
	"height" numeric(10,3),
	"vol" numeric(10,3),
	"region" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_packages_product_uom_key" UNIQUE("product_id","uom_id")
);
--> statement-breakpoint
CREATE TABLE "ms_core"."products" (
	"id" serial PRIMARY KEY,
	"region" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"code" varchar(100) NOT NULL,
	"name" varchar(100) NOT NULL,
	"area_id" integer NOT NULL,
	"base_uom_id" integer NOT NULL,
	"ideal_rate_per_hour" numeric,
	"price" numeric(15,3),
	"cost" numeric(15,3),
	CONSTRAINT "products_code_region_key" UNIQUE("code","region")
);
--> statement-breakpoint
CREATE TABLE "ms_core"."products_work_centers" (
	"id" serial PRIMARY KEY,
	"product_id" integer NOT NULL,
	"work_center_id" integer NOT NULL,
	"region" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pwc_key" UNIQUE("product_id","work_center_id")
);
--> statement-breakpoint
CREATE TABLE "ms_reject"."reject_reasons_areas" (
	"id" serial PRIMARY KEY,
	"reason_id" integer NOT NULL,
	"area_id" integer NOT NULL,
	"region" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reject_reasons_areas_key" UNIQUE("reason_id","area_id")
);
--> statement-breakpoint
CREATE TABLE "ms_reject"."reject_reasons_equipments" (
	"id" serial PRIMARY KEY,
	"reason_id" integer NOT NULL,
	"equipment_id" integer NOT NULL,
	"region" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rre_key" UNIQUE("reason_id","equipment_id")
);
--> statement-breakpoint
CREATE TABLE "ms_reject"."reject_reasons" (
	"id" serial PRIMARY KEY,
	"region" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"code" varchar(100) NOT NULL,
	"name" varchar(100) NOT NULL,
	CONSTRAINT "reject_reasons_code_region_key" UNIQUE("code","region")
);
--> statement-breakpoint
CREATE TABLE "ms_reject"."reject_reasons_work_centers" (
	"id" serial PRIMARY KEY,
	"reason_id" integer NOT NULL,
	"work_center_id" integer NOT NULL,
	"region" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rrwc_key" UNIQUE("reason_id","work_center_id")
);
--> statement-breakpoint
CREATE TABLE "ms_core"."sites" (
	"id" serial PRIMARY KEY,
	"region" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"code" varchar(100) NOT NULL,
	"name" varchar(100) NOT NULL,
	"timezone" varchar NOT NULL,
	CONSTRAINT "sites_code_region_key" UNIQUE("code","region")
);
--> statement-breakpoint
CREATE TABLE "ms_core"."uom" (
	"id" serial PRIMARY KEY,
	"region" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"code" varchar(100) NOT NULL,
	"name" varchar(100) NOT NULL,
	CONSTRAINT "uom_code_region_key" UNIQUE("code","region")
);
--> statement-breakpoint
CREATE TABLE "ms_core"."work_center_classes" (
	"id" serial PRIMARY KEY,
	"region" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"code" varchar(100) NOT NULL,
	"name" varchar(100) NOT NULL,
	CONSTRAINT "wcc_code_region_key" UNIQUE("code","region")
);
--> statement-breakpoint
CREATE TABLE "ms_core"."work_centers" (
	"id" serial PRIMARY KEY,
	"region" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"code" varchar(100) NOT NULL,
	"name" varchar(100) NOT NULL,
	"area_id" integer NOT NULL,
	"type" "ms_core"."work_center_type" NOT NULL,
	"oee_mode" "ms_core"."oee_mode" NOT NULL,
	"workCenterClassId" integer,
	"ideal_rate_per_hour" numeric,
	CONSTRAINT "wc_code_region_key" UNIQUE("code","region"),
	CONSTRAINT "wc_mode_matches_type_ckx" CHECK (
      (type = 'production_unit'  AND oee_mode = 'continuous') OR
      (type = 'process_cell'     AND oee_mode = 'batch')      OR
      (type = 'production_line'  AND oee_mode = 'discrete')   OR
      (type = 'storage_zone'     AND oee_mode = 'none')
    )
);
--> statement-breakpoint
CREATE TABLE "ms_core"."work_units" (
	"id" serial PRIMARY KEY,
	"region" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"code" varchar(100) NOT NULL,
	"name" varchar(100) NOT NULL,
	"work_center_id" integer NOT NULL,
	"type" "ms_core"."work_unit_type" NOT NULL,
	CONSTRAINT "wu_code_region_key" UNIQUE("code","region")
);
--> statement-breakpoint
CREATE INDEX "areas_region_updated_idx" ON "ms_core"."areas" ("region","updated_at");--> statement-breakpoint
CREATE INDEX "areas_site_id_idx" ON "ms_core"."areas" ("site_id");--> statement-breakpoint
CREATE INDEX "downtime_actions_region_updated_idx" ON "ms_downtime"."downtime_actions" ("region","updated_at");--> statement-breakpoint
CREATE INDEX "dra_region_updated_idx" ON "ms_downtime"."downtime_reasons_areas" ("region","updated_at");--> statement-breakpoint
CREATE INDEX "dra_area_id_idx" ON "ms_downtime"."downtime_reasons_areas" ("area_id");--> statement-breakpoint
CREATE INDEX "dra_reason_id_idx" ON "ms_downtime"."downtime_reasons_areas" ("reason_id");--> statement-breakpoint
CREATE INDEX "dre_region_updated_idx" ON "ms_downtime"."downtime_reasons_equipments" ("region","updated_at");--> statement-breakpoint
CREATE INDEX "dre_machine_id_idx" ON "ms_downtime"."downtime_reasons_equipments" ("equipment_id");--> statement-breakpoint
CREATE INDEX "dre_reason_id_idx" ON "ms_downtime"."downtime_reasons_equipments" ("reason_id");--> statement-breakpoint
CREATE INDEX "dr_region_updated_idx" ON "ms_downtime"."downtime_reasons" ("region","updated_at");--> statement-breakpoint
CREATE INDEX "drwc_region_updated_idx" ON "ms_downtime"."downtime_reasons_work_centers" ("region","updated_at");--> statement-breakpoint
CREATE INDEX "drwc_line_id_idx" ON "ms_downtime"."downtime_reasons_work_centers" ("work_center_id");--> statement-breakpoint
CREATE INDEX "drwc_reason_id_idx" ON "ms_downtime"."downtime_reasons_work_centers" ("reason_id");--> statement-breakpoint
CREATE INDEX "ec_region_updated_idx" ON "ms_core"."equipment_classes" ("region","updated_at");--> statement-breakpoint
CREATE INDEX "ef_region_updated_idx" ON "ms_core"."equipment_flows" ("region","updated_at");--> statement-breakpoint
CREATE INDEX "ef_wc_id_idx" ON "ms_core"."equipment_flows" ("work_center_id");--> statement-breakpoint
CREATE INDEX "ef_to_eq_id_idx" ON "ms_core"."equipment_flows" ("to_equipment_id");--> statement-breakpoint
CREATE INDEX "equipments_region_updated_idx" ON "ms_core"."equipments" ("region","updated_at");--> statement-breakpoint
CREATE INDEX "equipments_wu_id_idx" ON "ms_core"."equipments" ("work_unit_id");--> statement-breakpoint
CREATE INDEX "equipments_parent_id_idx" ON "ms_core"."equipments" ("parent_equipment_id");--> statement-breakpoint
CREATE INDEX "ocp_region_updated_idx" ON "ms_core"."oee_count_points" ("region","updated_at");--> statement-breakpoint
CREATE INDEX "ix_ocp_eq" ON "ms_core"."oee_count_points" ("equipment_id");--> statement-breakpoint
CREATE INDEX "pca_product_id_idx" ON "ms_core"."product_code_aliases" ("product_id");--> statement-breakpoint
CREATE INDEX "pca_equipment_id_idx" ON "ms_core"."product_code_aliases" ("equipment_id");--> statement-breakpoint
CREATE INDEX "pconv_region_updated_idx" ON "ms_core"."product_convertions" ("region","updated_at");--> statement-breakpoint
CREATE INDEX "pconv_product_id_idx" ON "ms_core"."product_convertions" ("product_id");--> statement-breakpoint
CREATE INDEX "pconv_uom_id_idx" ON "ms_core"."product_convertions" ("uom_id");--> statement-breakpoint
CREATE INDEX "pes_region_updated_idx" ON "ms_core"."product_equipment_specs" ("region","updated_at");--> statement-breakpoint
CREATE INDEX "pes_equipment_id_idx" ON "ms_core"."product_equipment_specs" ("equipment_id");--> statement-breakpoint
CREATE INDEX "pes_product_id_idx" ON "ms_core"."product_equipment_specs" ("product_id");--> statement-breakpoint
CREATE INDEX "pes_uom_id_idx" ON "ms_core"."product_equipment_specs" ("uom_id");--> statement-breakpoint
CREATE INDEX "products_packages_region_updated_idx" ON "ms_core"."product_packages" ("region","updated_at");--> statement-breakpoint
CREATE INDEX "product_packages_product_id_idx" ON "ms_core"."product_packages" ("product_id");--> statement-breakpoint
CREATE INDEX "product_packages_uom_id_idx" ON "ms_core"."product_packages" ("uom_id");--> statement-breakpoint
CREATE INDEX "products_region_updated_idx" ON "ms_core"."products" ("region","updated_at");--> statement-breakpoint
CREATE INDEX "products_area_id_idx" ON "ms_core"."products" ("area_id");--> statement-breakpoint
CREATE INDEX "pwc_region_updated_idx" ON "ms_core"."products_work_centers" ("region","updated_at");--> statement-breakpoint
CREATE INDEX "pwc_product_id_idx" ON "ms_core"."products_work_centers" ("product_id");--> statement-breakpoint
CREATE INDEX "reject_reasons_areas_region_updated_idx" ON "ms_reject"."reject_reasons_areas" ("region","updated_at");--> statement-breakpoint
CREATE INDEX "reject_reasons_areas_area_id_idx" ON "ms_reject"."reject_reasons_areas" ("area_id");--> statement-breakpoint
CREATE INDEX "reject_reasons_areas_reason_id_idx" ON "ms_reject"."reject_reasons_areas" ("reason_id");--> statement-breakpoint
CREATE INDEX "rre_region_updated_idx" ON "ms_reject"."reject_reasons_equipments" ("region","updated_at");--> statement-breakpoint
CREATE INDEX "rre_machine_id_idx" ON "ms_reject"."reject_reasons_equipments" ("equipment_id");--> statement-breakpoint
CREATE INDEX "rre_reason_id_idx" ON "ms_reject"."reject_reasons_equipments" ("reason_id");--> statement-breakpoint
CREATE INDEX "reject_reasons_region_updated_idx" ON "ms_reject"."reject_reasons" ("region","updated_at");--> statement-breakpoint
CREATE INDEX "rrwc_region_updated_idx" ON "ms_reject"."reject_reasons_work_centers" ("region","updated_at");--> statement-breakpoint
CREATE INDEX "rrwc_line_id_idx" ON "ms_reject"."reject_reasons_work_centers" ("work_center_id");--> statement-breakpoint
CREATE INDEX "rrwc_reason_id_idx" ON "ms_reject"."reject_reasons_work_centers" ("reason_id");--> statement-breakpoint
CREATE INDEX "sites_region_updated_idx" ON "ms_core"."sites" ("region","updated_at");--> statement-breakpoint
CREATE INDEX "uom_region_updated_idx" ON "ms_core"."uom" ("region","updated_at");--> statement-breakpoint
CREATE INDEX "wcc_region_updated_idx" ON "ms_core"."work_center_classes" ("region","updated_at");--> statement-breakpoint
CREATE INDEX "wc_region_updated_idx" ON "ms_core"."work_centers" ("region","updated_at");--> statement-breakpoint
CREATE INDEX "wc_area_id_idx" ON "ms_core"."work_centers" ("area_id");--> statement-breakpoint
CREATE INDEX "wu_region_updated_idx" ON "ms_core"."work_units" ("region","updated_at");--> statement-breakpoint
CREATE INDEX "wu_wc_id_idx" ON "ms_core"."work_units" ("work_center_id");--> statement-breakpoint
ALTER TABLE "ms_core"."areas" ADD CONSTRAINT "areas_site_id_sites_id_fkey" FOREIGN KEY ("site_id") REFERENCES "ms_core"."sites"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "ms_downtime"."downtime_reasons_areas" ADD CONSTRAINT "downtime_reasons_areas_reason_id_downtime_reasons_id_fkey" FOREIGN KEY ("reason_id") REFERENCES "ms_downtime"."downtime_reasons"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ms_downtime"."downtime_reasons_equipments" ADD CONSTRAINT "downtime_reasons_equipments_reason_id_downtime_reasons_id_fkey" FOREIGN KEY ("reason_id") REFERENCES "ms_downtime"."downtime_reasons"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ms_downtime"."downtime_reasons_work_centers" ADD CONSTRAINT "downtime_reasons_work_centers_xOvNa48QEwFR_fkey" FOREIGN KEY ("reason_id") REFERENCES "ms_downtime"."downtime_reasons"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ms_core"."equipment_flows" ADD CONSTRAINT "equipment_flows_work_center_id_work_centers_id_fkey" FOREIGN KEY ("work_center_id") REFERENCES "ms_core"."work_centers"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "ms_core"."equipment_flows" ADD CONSTRAINT "equipment_flows_from_equipment_id_equipments_id_fkey" FOREIGN KEY ("from_equipment_id") REFERENCES "ms_core"."equipments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ms_core"."equipment_flows" ADD CONSTRAINT "equipment_flows_to_equipment_id_equipments_id_fkey" FOREIGN KEY ("to_equipment_id") REFERENCES "ms_core"."equipments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ms_core"."equipments" ADD CONSTRAINT "equipments_work_unit_id_work_units_id_fkey" FOREIGN KEY ("work_unit_id") REFERENCES "ms_core"."work_units"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "ms_core"."equipments" ADD CONSTRAINT "equipments_parent_equipment_id_equipments_id_fkey" FOREIGN KEY ("parent_equipment_id") REFERENCES "ms_core"."equipments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ms_core"."equipments" ADD CONSTRAINT "equipments_equipmentClassId_equipment_classes_id_fkey" FOREIGN KEY ("equipmentClassId") REFERENCES "ms_core"."equipment_classes"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "ms_core"."oee_count_points" ADD CONSTRAINT "oee_count_points_equipment_id_equipments_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "ms_core"."equipments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ms_core"."product_code_aliases" ADD CONSTRAINT "product_code_aliases_equipment_id_equipments_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "ms_core"."equipments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ms_core"."product_code_aliases" ADD CONSTRAINT "product_code_aliases_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "ms_core"."products"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ms_core"."product_convertions" ADD CONSTRAINT "product_convertions_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "ms_core"."products"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ms_core"."product_convertions" ADD CONSTRAINT "product_convertions_uom_id_uom_id_fkey" FOREIGN KEY ("uom_id") REFERENCES "ms_core"."uom"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "ms_core"."product_equipment_specs" ADD CONSTRAINT "product_equipment_specs_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "ms_core"."products"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ms_core"."product_equipment_specs" ADD CONSTRAINT "product_equipment_specs_equipment_id_equipments_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "ms_core"."equipments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ms_core"."product_equipment_specs" ADD CONSTRAINT "product_equipment_specs_uom_id_uom_id_fkey" FOREIGN KEY ("uom_id") REFERENCES "ms_core"."uom"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ms_core"."product_packages" ADD CONSTRAINT "product_packages_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "ms_core"."products"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ms_core"."product_packages" ADD CONSTRAINT "product_packages_uom_id_uom_id_fkey" FOREIGN KEY ("uom_id") REFERENCES "ms_core"."uom"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "ms_core"."products" ADD CONSTRAINT "products_area_id_areas_id_fkey" FOREIGN KEY ("area_id") REFERENCES "ms_core"."areas"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "ms_core"."products" ADD CONSTRAINT "products_base_uom_id_uom_id_fkey" FOREIGN KEY ("base_uom_id") REFERENCES "ms_core"."uom"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "ms_core"."products_work_centers" ADD CONSTRAINT "products_work_centers_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "ms_core"."products"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ms_core"."products_work_centers" ADD CONSTRAINT "products_work_centers_work_center_id_work_centers_id_fkey" FOREIGN KEY ("work_center_id") REFERENCES "ms_core"."work_centers"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ms_reject"."reject_reasons_areas" ADD CONSTRAINT "reject_reasons_areas_reason_id_reject_reasons_id_fkey" FOREIGN KEY ("reason_id") REFERENCES "ms_reject"."reject_reasons"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ms_reject"."reject_reasons_equipments" ADD CONSTRAINT "reject_reasons_equipments_reason_id_reject_reasons_id_fkey" FOREIGN KEY ("reason_id") REFERENCES "ms_reject"."reject_reasons"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ms_reject"."reject_reasons_work_centers" ADD CONSTRAINT "reject_reasons_work_centers_reason_id_reject_reasons_id_fkey" FOREIGN KEY ("reason_id") REFERENCES "ms_reject"."reject_reasons"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ms_core"."work_centers" ADD CONSTRAINT "work_centers_area_id_areas_id_fkey" FOREIGN KEY ("area_id") REFERENCES "ms_core"."areas"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "ms_core"."work_centers" ADD CONSTRAINT "work_centers_workCenterClassId_work_center_classes_id_fkey" FOREIGN KEY ("workCenterClassId") REFERENCES "ms_core"."work_center_classes"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "ms_core"."work_units" ADD CONSTRAINT "work_units_work_center_id_work_centers_id_fkey" FOREIGN KEY ("work_center_id") REFERENCES "ms_core"."work_centers"("id") ON DELETE RESTRICT;