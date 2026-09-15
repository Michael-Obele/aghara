CREATE TABLE "health_probe_hours" (
	"bucket" timestamp with time zone PRIMARY KEY NOT NULL,
	"ok_count" integer NOT NULL,
	"fail_count" integer NOT NULL,
	"min_ms" integer NOT NULL,
	"avg_ms" integer NOT NULL,
	"max_ms" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "health_probes" (
	"checked_at" timestamp with time zone PRIMARY KEY NOT NULL,
	"ok" boolean NOT NULL,
	"latency_ms" integer NOT NULL,
	"status_code" integer
);
--> statement-breakpoint
CREATE INDEX "ix_probe_time" ON "health_probes" USING btree ("checked_at");