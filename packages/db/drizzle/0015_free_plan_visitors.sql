-- Free plan: unique website visitors (free sites show the basics after 50 people) (Nov 2026).
-- Written by hand like 0007-0014 (the drizzle snapshot stops at 0005). Idempotent.
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "visitor_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "site_visitors" (
	"event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE cascade,
	"visitor_id" text NOT NULL,
	"n" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_visitors_event_id_visitor_id_pk" PRIMARY KEY("event_id","visitor_id")
);--> statement-breakpoint
-- Free-plan allowance: automatic link-preview covers don't count until the user downloads one.
ALTER TABLE "renders" ADD COLUMN IF NOT EXISTS "free_counted" boolean DEFAULT true NOT NULL;--> statement-breakpoint
-- Free-plan allowance counts read a user's watermarked renders by format.
CREATE INDEX IF NOT EXISTS "renders_user_free_idx" ON "renders" USING btree ("user_id","format") WHERE "watermark" = true AND "free_counted" = true;
