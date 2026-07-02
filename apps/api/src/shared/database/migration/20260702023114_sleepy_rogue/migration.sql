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
CREATE INDEX "downtime_actions_region_updated_idx" ON "ms_downtime"."downtime_actions" ("region","updated_at");