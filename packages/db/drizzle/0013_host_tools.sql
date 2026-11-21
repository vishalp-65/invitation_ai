-- Host tools: follow-ups, check-in, thank-yous, co-hosts, shagun list, error tracking.
-- Written by hand like 0007-0012 (the drizzle snapshot stops at 0005). Idempotent.
ALTER TABLE "guests" ADD COLUMN IF NOT EXISTS "nudges" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "guests" ADD COLUMN IF NOT EXISTS "last_nudge_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "guests" ADD COLUMN IF NOT EXISTS "checked_in_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "guests" ADD COLUMN IF NOT EXISTS "checked_in_pax" integer;--> statement-breakpoint
ALTER TABLE "guests" ADD COLUMN IF NOT EXISTS "thanked_at" timestamp with time zone;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "event_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE cascade,
  "user_id" uuid REFERENCES "users"("id") ON DELETE cascade,
  "email" text NOT NULL,
  "role" text NOT NULL,
  "invited_by" uuid REFERENCES "users"("id") ON DELETE set null,
  "accepted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "event_members_email_uq" ON "event_members" USING btree ("event_id","email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_members_user_idx" ON "event_members" USING btree ("user_id");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "site_gifts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE cascade,
  "guest_id" uuid REFERENCES "guests"("id") ON DELETE set null,
  "name" text NOT NULL,
  "phone" text,
  "amount_paise" integer,
  "method" text DEFAULT 'upi' NOT NULL,
  "note" text,
  "source" text DEFAULT 'guest' NOT NULL,
  "thanked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "site_gifts_event_idx" ON "site_gifts" USING btree ("event_id","created_at");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "app_errors" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "fingerprint" text NOT NULL,
  "source" text NOT NULL,
  "message" text NOT NULL,
  "stack" text,
  "url" text,
  "count" integer DEFAULT 1 NOT NULL,
  "first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
  "resolved_at" timestamp with time zone
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "app_errors_fingerprint_uq" ON "app_errors" USING btree ("fingerprint");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "app_errors_seen_idx" ON "app_errors" USING btree ("last_seen_at");
