-- Admin round 3: attribution, guest analytics, switches, alerts, daily metrics, media, refunds,
-- data-protection requests, admin scopes, and monthly partitions for analytics_events.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referred_event_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "admin_scopes" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "admin_digest" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_method" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "refunded_paise" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "refunded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "refund_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "refund_reason" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_referred_event_idx" ON "users" USING btree ("referred_event_id") WHERE "referred_event_id" IS NOT NULL;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "visitor_attribution" (
	"visitor_id" text PRIMARY KEY NOT NULL,
	"user_id" uuid REFERENCES "public"."users"("id") ON DELETE set null,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"channel" text NOT NULL,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"referrer" text,
	"landing_path" text,
	"country" text,
	"state" text,
	"city" text,
	"tier" text,
	"language" text,
	"network" text,
	"in_app" text,
	"device" text,
	"last_campaign" text
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "visitor_attr_user_idx" ON "visitor_attribution" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "visitor_attr_time_idx" ON "visitor_attribution" USING btree ("first_seen_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "visitor_attr_campaign_idx" ON "visitor_attribution" USING btree ("utm_campaign") WHERE "utm_campaign" IS NOT NULL;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "invitation_daily" (
	"event_id" uuid NOT NULL REFERENCES "public"."events"("id") ON DELETE cascade,
	"day" date NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"guest_views" integer DEFAULT 0 NOT NULL,
	"whatsapp_views" integer DEFAULT 0 NOT NULL,
	"mobile_views" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "invitation_daily_event_id_day_pk" PRIMARY KEY("event_id","day")
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invitation_daily_day_idx" ON "invitation_daily" USING btree ("day");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "feature_flags" (
	"key" text PRIMARY KEY NOT NULL,
	"enabled" boolean NOT NULL,
	"rollout_pct" integer DEFAULT 100 NOT NULL,
	"description" text,
	"message" text,
	"updated_by" uuid REFERENCES "public"."users"("id") ON DELETE set null,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "admin_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"severity" text DEFAULT 'warn' NOT NULL,
	"title" text NOT NULL,
	"detail" text,
	"data" jsonb,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_alerts_time_idx" ON "admin_alerts" USING btree ("created_at");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "daily_metrics" (
	"day" date PRIMARY KEY NOT NULL,
	"visitors" integer DEFAULT 0 NOT NULL,
	"signups" integer DEFAULT 0 NOT NULL,
	"active_users" integer DEFAULT 0 NOT NULL,
	"invitations" integer DEFAULT 0 NOT NULL,
	"orders" integer DEFAULT 0 NOT NULL,
	"revenue_paise" integer DEFAULT 0 NOT NULL,
	"refunds_paise" integer DEFAULT 0 NOT NULL,
	"engaged_seconds" integer DEFAULT 0 NOT NULL,
	"guest_views" integer DEFAULT 0 NOT NULL,
	"renders_failed" integer DEFAULT 0 NOT NULL,
	"ai_cost_micro_usd" integer DEFAULT 0 NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "site_media" (
	"slot" text PRIMARY KEY NOT NULL,
	"storage_key" text NOT NULL,
	"content_type" text NOT NULL,
	"bytes" integer,
	"updated_by" uuid REFERENCES "public"."users"("id") ON DELETE set null,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "data_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"note" text,
	"handled_by" uuid REFERENCES "public"."users"("id") ON DELETE set null,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "data_requests_user_idx" ON "data_requests" USING btree ("user_id");--> statement-breakpoint

-- ---------- analytics_events → monthly range partitions ----------
-- Old months can then be dropped instantly (retention) and every time-bounded query only touches
-- the months it needs. Runs once: skipped if the table is already partitioned.
DO $$
DECLARE
	start_month date;
	m date;
BEGIN
	IF (SELECT c.relkind FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'analytics_events') = 'p' THEN
		RETURN;
	END IF;

	ALTER TABLE "analytics_events" RENAME TO "analytics_events_unpartitioned";

	CREATE TABLE "analytics_events" (
		"id" uuid DEFAULT gen_random_uuid() NOT NULL,
		"name" text NOT NULL,
		"visitor_id" text NOT NULL,
		"session_id" text,
		"user_id" uuid REFERENCES "public"."users"("id") ON DELETE set null,
		"path" text,
		"referrer" text,
		"device" text,
		"template_id" text,
		"props" jsonb,
		"created_at" timestamp with time zone DEFAULT now() NOT NULL,
		CONSTRAINT "analytics_events_id_created_at_pk" PRIMARY KEY ("id", "created_at")
	) PARTITION BY RANGE ("created_at");

	CREATE TABLE "analytics_events_default" PARTITION OF "analytics_events" DEFAULT;

	start_month := date_trunc('month', coalesce((SELECT min(created_at) FROM "analytics_events_unpartitioned"), now()))::date;
	m := start_month;
	WHILE m <= (date_trunc('month', now()) + interval '2 months')::date LOOP
		EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF "analytics_events" FOR VALUES FROM (%L) TO (%L)',
			'analytics_events_' || to_char(m, 'YYYY_MM'), m, (m + interval '1 month')::date);
		m := (m + interval '1 month')::date;
	END LOOP;

	INSERT INTO "analytics_events" SELECT "id", "name", "visitor_id", "session_id", "user_id", "path", "referrer", "device", "template_id", "props", "created_at" FROM "analytics_events_unpartitioned";
	DROP TABLE "analytics_events_unpartitioned";

	CREATE INDEX "analytics_name_time_idx" ON "analytics_events" USING btree ("name", "created_at");
	CREATE INDEX "analytics_visitor_idx" ON "analytics_events" USING btree ("visitor_id");
	CREATE INDEX "analytics_user_idx" ON "analytics_events" USING btree ("user_id", "created_at");
	CREATE INDEX "analytics_template_idx" ON "analytics_events" USING btree ("template_id", "created_at");
	CREATE INDEX "analytics_time_brin" ON "analytics_events" USING brin ("created_at");
END $$;--> statement-breakpoint

-- Called by the nightly ops job: keeps partitions `ahead` months into the future.
CREATE OR REPLACE FUNCTION ensure_analytics_partitions(ahead int) RETURNS int LANGUAGE plpgsql AS $$
DECLARE
	m date := date_trunc('month', now())::date;
	made int := 0;
	name text;
BEGIN
	WHILE m <= (date_trunc('month', now()) + make_interval(months => ahead))::date LOOP
		name := 'analytics_events_' || to_char(m, 'YYYY_MM');
		IF to_regclass('public.' || name) IS NULL THEN
			EXECUTE format('CREATE TABLE %I PARTITION OF "analytics_events" FOR VALUES FROM (%L) TO (%L)', name, m, (m + interval '1 month')::date);
			made := made + 1;
		END IF;
		m := (m + interval '1 month')::date;
	END LOOP;
	RETURN made;
END $$;--> statement-breakpoint

-- Drops whole months older than `keep_months` (raw events only; daily rollups are kept forever).
CREATE OR REPLACE FUNCTION drop_old_analytics_partitions(keep_months int) RETURNS int LANGUAGE plpgsql AS $$
DECLARE
	r record;
	cutoff text := 'analytics_events_' || to_char(date_trunc('month', now()) - make_interval(months => keep_months), 'YYYY_MM');
	dropped int := 0;
BEGIN
	FOR r IN
		SELECT c.relname FROM pg_inherits i JOIN pg_class c ON c.oid = i.inhrelid JOIN pg_class p ON p.oid = i.inhparent
		WHERE p.relname = 'analytics_events' AND c.relname ~ '^analytics_events_\d{4}_\d{2}$' AND c.relname < cutoff
	LOOP
		EXECUTE format('DROP TABLE %I', r.relname);
		dropped := dropped + 1;
	END LOOP;
	RETURN dropped;
END $$;
