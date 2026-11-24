CREATE TABLE "job_heartbeat" (
	"job" text PRIMARY KEY NOT NULL,
	"last_run_at" timestamp with time zone NOT NULL
);
