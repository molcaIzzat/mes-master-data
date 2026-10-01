CREATE TYPE "ms_core"."other_data_type" AS ENUM('boolean', 'int16', 'uint16', 'int32', 'uint32', 'int64', 'uint64', 'float', 'double', 'string');--> statement-breakpoint
CREATE TYPE "ms_core"."other_role" AS ENUM('downtime', 'reject');--> statement-breakpoint
CREATE TABLE "ms_core"."other_points" (
	"id" serial PRIMARY KEY,
	"work_unit_id" integer NOT NULL,
	"equipment_id" integer,
	"role" "ms_core"."other_role" NOT NULL,
	"data_type" "ms_core"."other_data_type" DEFAULT 'boolean'::"ms_core"."other_data_type" NOT NULL,
	"source_tag" varchar(255) NOT NULL,
	"region" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "op_wu_role_source_tag_key" UNIQUE("work_unit_id","role","source_tag")
);
--> statement-breakpoint
CREATE INDEX "op_region_updated_idx" ON "ms_core"."other_points" ("region","updated_at");--> statement-breakpoint
CREATE INDEX "op_wu_id_idx" ON "ms_core"."other_points" ("work_unit_id");--> statement-breakpoint
ALTER TABLE "ms_core"."other_points" ADD CONSTRAINT "other_points_work_unit_id_work_units_id_fkey" FOREIGN KEY ("work_unit_id") REFERENCES "ms_core"."work_units"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ms_core"."other_points" ADD CONSTRAINT "other_points_equipment_id_equipments_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "ms_core"."equipments"("id") ON DELETE CASCADE;