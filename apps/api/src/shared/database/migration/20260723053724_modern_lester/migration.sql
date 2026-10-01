DROP TABLE "ms_core"."product_convertions";--> statement-breakpoint
ALTER TABLE "ms_core"."product_packages" ADD COLUMN "factor_to_base" numeric(10,3) NOT NULL;--> statement-breakpoint
ALTER TABLE "ms_core"."product_packages" ADD CONSTRAINT "pconv_pconv_ftb_cx" CHECK (factor_to_base > 0);