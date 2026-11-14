ALTER TABLE "users" ALTER COLUMN "phone" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "google_sub" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_url" text;--> statement-breakpoint
-- Emails entered before verification existed were never proven: drop them so they cannot be used to take over accounts.
UPDATE "users" SET "email" = lower("email") WHERE "email" IS NOT NULL;--> statement-breakpoint
UPDATE "users" SET "email" = NULL WHERE "email" IS NOT NULL AND "email_verified_at" IS NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_google_sub_unique" UNIQUE("google_sub");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_verified_uq" ON "users" USING btree (lower("email")) WHERE "email_verified_at" is not null;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_has_contact" CHECK ("phone" is not null or "email" is not null or "google_sub" is not null);
