-- Gift wishlist reservations and countdown Status videos (Nov 2026).
-- Written by hand like 0007-0013 (the drizzle snapshot stops at 0005). Idempotent.
ALTER TYPE "render_format" ADD VALUE IF NOT EXISTS 'status_video';--> statement-breakpoint
ALTER TABLE "site_gifts" ADD COLUMN IF NOT EXISTS "wish_id" text;--> statement-breakpoint
-- One reservation per wishlist item (a released item can be reserved again).
CREATE UNIQUE INDEX IF NOT EXISTS "site_gifts_wish_uq" ON "site_gifts" USING btree ("event_id","wish_id") WHERE "wish_id" IS NOT NULL;
