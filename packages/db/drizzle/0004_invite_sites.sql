ALTER TABLE "events" ADD COLUMN "site" jsonb;
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "site_password_hash" text;
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "short_code" text;
--> statement-breakpoint
CREATE UNIQUE INDEX "events_short_code_uq" ON "events" USING btree ("short_code");
--> statement-breakpoint
ALTER TABLE "guests" ADD COLUMN "short_code" text;
--> statement-breakpoint
ALTER TABLE "guests" ADD COLUMN "stay" jsonb;
--> statement-breakpoint
CREATE UNIQUE INDEX "guests_short_code_uq" ON "guests" USING btree ("short_code");
--> statement-breakpoint
CREATE TABLE "short_aliases" (
	"alias" text PRIMARY KEY NOT NULL,
	"event_id" uuid NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "short_aliases" ADD CONSTRAINT "short_aliases_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "short_aliases_event_idx" ON "short_aliases" USING btree ("event_id");
--> statement-breakpoint
CREATE TABLE "site_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"text" text NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "site_updates" ADD CONSTRAINT "site_updates_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "site_updates_event_idx" ON "site_updates" USING btree ("event_id","created_at");
--> statement-breakpoint
CREATE TABLE "site_wishes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"guest_id" uuid,
	"name" text NOT NULL,
	"message" text NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "site_wishes" ADD CONSTRAINT "site_wishes_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "site_wishes" ADD CONSTRAINT "site_wishes_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "site_wishes_event_idx" ON "site_wishes" USING btree ("event_id","created_at");
