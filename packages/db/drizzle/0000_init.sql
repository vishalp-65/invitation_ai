CREATE TYPE "public"."ai_kind" AS ENUM('wording', 'transliteration', 'translation', 'image', 'video_clip', 'intent', 'transcription');--> statement-breakpoint
CREATE TYPE "public"."asset_kind" AS ENUM('photo', 'ai_image', 'ai_clip', 'music', 'render');--> statement-breakpoint
CREATE TYPE "public"."designer_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('queued', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('created', 'paid', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('pending', 'paid');--> statement-breakpoint
CREATE TYPE "public"."print_order_status" AS ENUM('requested', 'quoted', 'confirmed', 'printing', 'shipped', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."render_format" AS ENUM('image', 'pdf', 'print_pdf', 'video');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('draft', 'submitted', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."rsvp_status" AS ENUM('yes', 'no', 'maybe');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'designer', 'agent', 'admin');--> statement-breakpoint
CREATE TABLE "ai_generations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"event_id" uuid,
	"kind" "ai_kind" NOT NULL,
	"model" text,
	"status" "job_status" DEFAULT 'queued' NOT NULL,
	"external_id" text,
	"input" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"output" jsonb,
	"asset_id" uuid,
	"cost_usd" numeric(10, 5),
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "designer_earnings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"designer_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"template_key" text NOT NULL,
	"amount_paise" integer NOT NULL,
	"status" "payout_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "designer_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"bio" text,
	"portfolio_url" text,
	"payout_upi" text NOT NULL,
	"status" "designer_status" DEFAULT 'pending' NOT NULL,
	"revenue_share_pct" integer DEFAULT 30 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entitlements" (
	"event_id" uuid NOT NULL,
	"feature" text NOT NULL,
	"credits" integer DEFAULT 0 NOT NULL,
	"order_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entitlements_event_id_feature_pk" PRIMARY KEY("event_id","feature")
);
--> statement-breakpoint
CREATE TABLE "event_functions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"name" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"venue_name" text NOT NULL,
	"venue_address" text,
	"map_url" text,
	"dress_code" text,
	"notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"status" "event_status" DEFAULT 'draft' NOT NULL,
	"type" text NOT NULL,
	"language" text NOT NULL,
	"secondary_language" text,
	"community" text,
	"template_id" text NOT NULL,
	"title" text NOT NULL,
	"content" jsonb NOT NULL,
	"settings" jsonb NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"group_label" text,
	"salutation" text,
	"max_pax" integer DEFAULT 2 NOT NULL,
	"function_ids" jsonb,
	"token" text NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"first_viewed_at" timestamp with time zone,
	"last_viewed_at" timestamp with time zone,
	"invited_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"designer_id" uuid NOT NULL,
	"template_key" text NOT NULL,
	"name" text NOT NULL,
	"layout" text NOT NULL,
	"theme" jsonb NOT NULL,
	"event_types" jsonb NOT NULL,
	"communities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "review_status" DEFAULT 'draft' NOT NULL,
	"review_note" text,
	"sales_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"event_id" uuid,
	"kind" "asset_kind" NOT NULL,
	"storage_key" text NOT NULL,
	"content_type" text NOT NULL,
	"bytes" integer,
	"width" integer,
	"height" integer,
	"ready" boolean DEFAULT false NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "music_tracks" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"mood" text NOT NULL,
	"storage_key" text NOT NULL,
	"duration_sec" integer NOT NULL,
	"license" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"product_code" text NOT NULL,
	"amount_paise" integer NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"status" "order_status" DEFAULT 'created' NOT NULL,
	"provider" text DEFAULT 'razorpay' NOT NULL,
	"provider_order_id" text,
	"provider_payment_id" text,
	"template_id" text,
	"agent_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "print_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"partner_id" uuid,
	"render_id" uuid,
	"quantity" integer NOT NULL,
	"paper_type" text NOT NULL,
	"status" "print_order_status" DEFAULT 'requested' NOT NULL,
	"quote_paise" integer,
	"shipping_address" jsonb NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "print_partners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"phone" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"price_list" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "renders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"format" "render_format" NOT NULL,
	"status" "job_status" DEFAULT 'queued' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"watermark" boolean NOT NULL,
	"input_hash" text NOT NULL,
	"outputs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"error" text,
	"notify" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "rsvps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"function_id" uuid NOT NULL,
	"guest_id" uuid,
	"name" text NOT NULL,
	"phone" text,
	"status" "rsvp_status" NOT NULL,
	"headcount" integer DEFAULT 1 NOT NULL,
	"meal_preference" text,
	"needs_accommodation" boolean,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"refresh_token_hash" text NOT NULL,
	"user_agent" text,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"name" text,
	"email" text,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"referred_by_agent_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "designer_earnings" ADD CONSTRAINT "designer_earnings_designer_id_users_id_fk" FOREIGN KEY ("designer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "designer_earnings" ADD CONSTRAINT "designer_earnings_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "designer_profiles" ADD CONSTRAINT "designer_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_functions" ADD CONSTRAINT "event_functions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guests" ADD CONSTRAINT "guests_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_templates" ADD CONSTRAINT "marketplace_templates_designer_id_users_id_fk" FOREIGN KEY ("designer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_orders" ADD CONSTRAINT "print_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_orders" ADD CONSTRAINT "print_orders_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_orders" ADD CONSTRAINT "print_orders_partner_id_print_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."print_partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_orders" ADD CONSTRAINT "print_orders_render_id_renders_id_fk" FOREIGN KEY ("render_id") REFERENCES "public"."renders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renders" ADD CONSTRAINT "renders_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renders" ADD CONSTRAINT "renders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvps" ADD CONSTRAINT "rsvps_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvps" ADD CONSTRAINT "rsvps_function_id_event_functions_id_fk" FOREIGN KEY ("function_id") REFERENCES "public"."event_functions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvps" ADD CONSTRAINT "rsvps_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_generations_user_id_kind_created_at_index" ON "ai_generations" USING btree ("user_id","kind","created_at");--> statement-breakpoint
CREATE INDEX "ai_generations_event_id_index" ON "ai_generations" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "designer_earnings_order_id_index" ON "designer_earnings" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "designer_earnings_designer_id_index" ON "designer_earnings" USING btree ("designer_id");--> statement-breakpoint
CREATE INDEX "event_functions_event_id_sort_order_index" ON "event_functions" USING btree ("event_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "events_slug_index" ON "events" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "events_user_id_created_at_index" ON "events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "guests_token_index" ON "guests" USING btree ("token");--> statement-breakpoint
CREATE INDEX "guests_event_id_index" ON "guests" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "marketplace_templates_template_key_index" ON "marketplace_templates" USING btree ("template_key");--> statement-breakpoint
CREATE INDEX "marketplace_templates_status_index" ON "marketplace_templates" USING btree ("status");--> statement-breakpoint
CREATE INDEX "media_assets_event_id_kind_index" ON "media_assets" USING btree ("event_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_provider_order_id_index" ON "orders" USING btree ("provider_order_id");--> statement-breakpoint
CREATE INDEX "orders_user_id_index" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "orders_event_id_index" ON "orders" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "print_orders_user_id_index" ON "print_orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "print_orders_status_index" ON "print_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "renders_event_id_format_created_at_index" ON "renders" USING btree ("event_id","format","created_at");--> statement-breakpoint
CREATE INDEX "renders_input_hash_index" ON "renders" USING btree ("input_hash");--> statement-breakpoint
CREATE INDEX "rsvps_event_id_index" ON "rsvps" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rsvps_guest_id_function_id_index" ON "rsvps" USING btree ("guest_id","function_id") WHERE "rsvps"."guest_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "sessions_user_id_index" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_refresh_token_hash_index" ON "sessions" USING btree ("refresh_token_hash");