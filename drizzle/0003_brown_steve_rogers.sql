ALTER TABLE "posts" ADD COLUMN "segments" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "scheduled_posts" ADD COLUMN "posted_urls" jsonb DEFAULT '[]'::jsonb;