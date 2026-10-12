import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const teams = pgTable("teams", {
  id: text().primaryKey(),
  name: text().notNull(),
  season: text().notNull(),
  code: text().notNull().unique(),
  accent: text().notNull(),
  dark: text().notNull(),
  themeId: text("theme_id").notNull(),
  themeName: text("theme_name").notNull(),
  coachUserId: text("coach_user_id").notNull().unique(),
  coachName: text("coach_name").notNull(),
  coachEmail: text("coach_email").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const players = pgTable("players", {
  id: text().primaryKey(),
  teamId: text("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  userId: text("user_id").unique(),
  email: text(),
  name: text().notNull(),
  number: text().notNull(),
  position: text().notNull(),
  status: text().notNull(),
  rating: text().notNull().default(""),
  review: text().notNull().default(""),
}, (table) => [index("players_team_idx").on(table.teamId)]);

export const events = pgTable("events", {
  id: text().primaryKey(),
  teamId: text("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  title: text().notNull(),
  type: text().notNull(),
  date: text().notNull(),
  time: text().notNull(),
  location: text().notNull(),
  notes: text().notNull().default(""),
  lineup: jsonb().$type<string[]>().notNull().default([]),
  report: jsonb().$type<Record<string, unknown> | null>(),
}, (table) => [index("events_team_idx").on(table.teamId)]);

export const plays = pgTable("plays", {
  id: text().primaryKey(),
  teamId: text("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  name: text().notNull(),
  category: text().notNull(),
  notes: text().notNull().default(""),
  videoUrl: text("video_url").notNull().default(""),
  diagram: text().notNull().default(""),
}, (table) => [index("plays_team_idx").on(table.teamId)]);

export const scouting = pgTable("scouting", {
  id: text().primaryKey(),
  teamId: text("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  opponent: text().notNull(),
  record: text().notNull().default(""),
  offense: text().notNull().default(""),
  defense: text().notNull().default(""),
  keyPlayers: jsonb("key_players").$type<Array<{ number: string; name: string; note: string }>>().notNull().default([]),
  keys: jsonb().$type<string[]>().notNull().default([]),
  notes: text().notNull().default(""),
  updated: text().notNull().default(""),
}, (table) => [index("scouting_team_idx").on(table.teamId)]);
