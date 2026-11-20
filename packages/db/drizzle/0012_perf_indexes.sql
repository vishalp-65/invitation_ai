-- Indexes for time-range scans run by the 10-minute health check, admin reports and the nightly purge.
-- BRIN for append-only created_at columns (tiny, fast to build). Written by hand like 0007-0011:
-- the drizzle snapshot stops at 0005, so `drizzle-kit generate` would re-create existing tables.
CREATE INDEX IF NOT EXISTS "orders_created_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "renders_created_brin" ON "renders" USING brin ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_generations_created_brin" ON "ai_generations" USING brin ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_expires_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "media_assets_user_idx" ON "media_assets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "media_assets_unready_idx" ON "media_assets" USING btree ("created_at") WHERE "ready" = false;
