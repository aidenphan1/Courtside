CREATE TABLE "events" (
	"id" text PRIMARY KEY,
	"team_id" text NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"date" text NOT NULL,
	"time" text NOT NULL,
	"location" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"lineup" jsonb DEFAULT '[]' NOT NULL,
	"report" jsonb
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" text PRIMARY KEY,
	"team_id" text NOT NULL,
	"user_id" text UNIQUE,
	"email" text,
	"name" text NOT NULL,
	"number" text NOT NULL,
	"position" text NOT NULL,
	"status" text NOT NULL,
	"rating" text DEFAULT '' NOT NULL,
	"review" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plays" (
	"id" text PRIMARY KEY,
	"team_id" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"video_url" text DEFAULT '' NOT NULL,
	"diagram" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scouting" (
	"id" text PRIMARY KEY,
	"team_id" text NOT NULL,
	"opponent" text NOT NULL,
	"record" text DEFAULT '' NOT NULL,
	"offense" text DEFAULT '' NOT NULL,
	"defense" text DEFAULT '' NOT NULL,
	"key_players" jsonb DEFAULT '[]' NOT NULL,
	"keys" jsonb DEFAULT '[]' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"updated" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"season" text NOT NULL,
	"code" text NOT NULL UNIQUE,
	"accent" text NOT NULL,
	"dark" text NOT NULL,
	"theme_id" text NOT NULL,
	"theme_name" text NOT NULL,
	"coach_user_id" text NOT NULL UNIQUE,
	"coach_name" text NOT NULL,
	"coach_email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "events_team_idx" ON "events" ("team_id");--> statement-breakpoint
CREATE INDEX "players_team_idx" ON "players" ("team_id");--> statement-breakpoint
CREATE INDEX "plays_team_idx" ON "plays" ("team_id");--> statement-breakpoint
CREATE INDEX "scouting_team_idx" ON "scouting" ("team_id");--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_team_id_teams_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_team_id_teams_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "plays" ADD CONSTRAINT "plays_team_id_teams_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "scouting" ADD CONSTRAINT "scouting_team_id_teams_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE;