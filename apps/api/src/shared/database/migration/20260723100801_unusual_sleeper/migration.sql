ALTER TABLE "ms_core"."product_code_aliases" ADD COLUMN "work_unit_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "ms_core"."product_code_aliases" ADD COLUMN "region" varchar(10) NOT NULL;--> statement-breakpoint
ALTER TABLE "ms_core"."product_code_aliases" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "ms_core"."product_code_aliases" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "pca_region_updated_idx" ON "ms_core"."product_code_aliases" ("region","updated_at");--> statement-breakpoint
ALTER TABLE "ms_core"."product_code_aliases" ADD CONSTRAINT "product_code_aliases_work_unit_id_work_units_id_fkey" FOREIGN KEY ("work_unit_id") REFERENCES "ms_core"."work_units"("id") ON DELETE CASCADE;