CREATE TABLE "coach_notes" (
	"id" text PRIMARY KEY,
	"team_id" text NOT NULL,
	"body" text NOT NULL,
	"updated" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX "coach_notes_team_idx" ON "coach_notes" ("team_id");--> statement-breakpoint
ALTER TABLE "coach_notes" ADD CONSTRAINT "coach_notes_team_id_teams_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE;