-- Admin console, round 2: plan editing, design-pack visibility, invitation take-downs, time-in-app rollup.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "admin_note" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "suspended_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "suspended_reason" text;--> statement-breakpoint
ALTER TABLE "product_overrides" ADD COLUMN IF NOT EXISTS "name" text;--> statement-breakpoint
ALTER TABLE "product_overrides" ADD COLUMN IF NOT EXISTS "description" text;--> statement-breakpoint
ALTER TABLE "product_overrides" ADD COLUMN IF NOT EXISTS "highlight" boolean;--> statement-breakpoint
ALTER TABLE "product_overrides" ADD COLUMN IF NOT EXISTS "disabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "site_design_overrides" (
	"design_id" text PRIMARY KEY NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"hide_showcase" boolean DEFAULT false NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_design_overrides_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "activity_daily" (
	"day" date NOT NULL,
	"visitor_id" text NOT NULL,
	"user_id" uuid,
	"active_seconds" integer DEFAULT 0 NOT NULL,
	"page_views" integer DEFAULT 0 NOT NULL,
	"device" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "activity_daily_day_visitor_id_pk" PRIMARY KEY("day","visitor_id"),
	CONSTRAINT "activity_daily_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_daily_user_idx" ON "activity_daily" USING btree ("user_id","day");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_daily_day_idx" ON "activity_daily" USING btree ("day");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analytics_time_brin" ON "analytics_events" USING brin ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_created_idx" ON "users" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_created_idx" ON "events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_paid_idx" ON "orders" USING btree ("paid_at") WHERE "orders"."status" = 'paid';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_coupon_idx" ON "orders" USING btree ("coupon_code") WHERE "orders"."coupon_code" is not null;--> statement-breakpoint
-- Backfill the rollup from page views already tracked, so time-series charts have history.
INSERT INTO "activity_daily" ("day", "visitor_id", "user_id", "page_views", "device")
SELECT (created_at AT TIME ZONE 'Asia/Kolkata')::date, visitor_id, (array_agg(user_id) FILTER (WHERE user_id IS NOT NULL))[1], count(*), max(device)
FROM "analytics_events" WHERE name = 'page_view'
GROUP BY 1, 2
ON CONFLICT DO NOTHING;
