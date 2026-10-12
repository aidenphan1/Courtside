import { and, eq } from "drizzle-orm";
import { events, players, plays, scouting, teams } from "../../../db/schema";
import { db } from "./db";
import { cleanText, eventType, isId, jersey, playCategory, playerStatus, position, sameJersey, whole } from "./validate";

type Team = typeof teams.$inferSelect;
type PlayerRow = typeof players.$inferSelect;

const statKeys = ["min", "fgm", "fga", "tpm", "tpa", "ftm", "fta", "reb", "ast", "stl", "blk", "tov", "pf"] as const;

function list(value: unknown) {
  return Array.isArray(value) ? value : null;
}

function report(value: unknown) {
  if (value == null) return null;
  if (!value || typeof value !== "object") return "Check the game report.";
  const source = value as Record<string, unknown>;
  const teamScore = whole(source.teamScore, 999);
  const opponentScore = whole(source.opponentScore, 999);
  const stats = list(source.stats);
  if (teamScore == null || opponentScore == null || !stats) return "Check the game report.";
  const lines = [];
  for (const item of stats) {
    if (!item || typeof item !== "object") return "Check the box score.";
    const line = item as Record<string, unknown>;
    if (!isId(line.playerId)) return "Check the box score.";
    const parsed: Record<string, unknown> = {
      playerId: line.playerId,
      name: cleanText(line.name, 80),
      number: jersey(line.number) ?? "",
      played: line.played === true,
    };
    for (const key of statKeys) {
      const score = whole(line[key], key === "min" ? 60 : 99);
      if (score == null) return "Check the box score.";
      parsed[key] = score;
    }
    lines.push(parsed);
  }
  return { teamScore, opponentScore, notes: cleanText(source.notes, 2000), stats: lines };
}

export function parseEvents(value: unknown) {
  const source = list(value);
  if (!source) return "The schedule could not be saved.";
  if (source.length > 300) return "The schedule is too large.";
  const rows = [];
  const ids = new Set<string>();
  for (const item of source) {
    if (!item || typeof item !== "object") return "Check the schedule and try again.";
    const event = item as Record<string, unknown>;
    const type = eventType(event.type);
    if (!isId(event.id) || !cleanText(event.title, 120) || !type) return "Check the schedule and try again.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanText(event.date, 10)) || !/^\d{2}:\d{2}$/.test(cleanText(event.time, 5))) return "Check the event date and time.";
    if (ids.has(event.id)) return "The schedule has a duplicate event.";
    ids.add(event.id);
    const lineup = list(event.lineup) ?? [];
    if (lineup.some((id) => !isId(id))) return "Check the lineup and try again.";
    const parsedReport = report(event.report);
    if (typeof parsedReport === "string") return parsedReport;
    rows.push({
      id: event.id,
      title: cleanText(event.title, 120),
      type,
      date: cleanText(event.date, 10),
      time: cleanText(event.time, 5),
      location: cleanText(event.location, 120),
      notes: cleanText(event.notes, 2000),
      lineup: [...new Set(lineup)] as string[],
      report: parsedReport,
    });
  }
  return rows;
}

export function parsePlays(value: unknown) {
  const source = list(value);
  if (!source) return "The playbook could not be saved.";
  if (source.length > 200) return "The playbook is too large.";
  const rows = [];
  const ids = new Set<string>();
  for (const item of source) {
    if (!item || typeof item !== "object") return "Check the play and try again.";
    const play = item as Record<string, unknown>;
    const category = playCategory(play.category);
    if (!isId(play.id) || !cleanText(play.name, 80) || !category) return "Give every play a name and category.";
    const diagram = typeof play.diagram === "string" ? play.diagram : "";
    if (diagram.length > 1_500_000) return "A play diagram is too large. Use a smaller image.";
    if (ids.has(play.id)) return "The playbook has a duplicate play.";
    ids.add(play.id);
    rows.push({
      id: play.id,
      name: cleanText(play.name, 80),
      category,
      notes: cleanText(play.notes, 2000),
      videoUrl: cleanText(play.videoUrl, 300),
      diagram,
    });
  }
  return rows;
}

export function parseScouting(value: unknown) {
  const source = list(value);
  if (!source) return "The scouting report could not be saved.";
  if (source.length > 100) return "There are too many scouting reports.";
  const rows = [];
  const ids = new Set<string>();
  for (const item of source) {
    if (!item || typeof item !== "object") return "Check the scouting report and try again.";
    const report = item as Record<string, unknown>;
    if (!isId(report.id) || !cleanText(report.opponent, 80)) return "Enter the opponent’s name.";
    if (ids.has(report.id)) return "There are two reports for the same id.";
    ids.add(report.id);
    const people = list(report.keyPlayers) ?? [];
    const keyPlayers = [];
    for (const person of people.slice(0, 12)) {
      if (!person || typeof person !== "object") continue;
      const player = person as Record<string, unknown>;
      const name = cleanText(player.name, 80);
      if (!name) continue;
      keyPlayers.push({ number: jersey(player.number) ?? "", name, note: cleanText(player.note, 160) });
    }
    const keys = (list(report.keys) ?? []).map((key) => cleanText(key, 160)).filter(Boolean).slice(0, 8);
    rows.push({
      id: report.id,
      opponent: cleanText(report.opponent, 80),
      record: cleanText(report.record, 20),
      offense: cleanText(report.offense, 2000),
      defense: cleanText(report.defense, 2000),
      keyPlayers,
      keys,
      notes: cleanText(report.notes, 2000),
      updated: cleanText(report.updated, 80),
    });
  }
  return rows;
}

export function parseManualPlayers(value: unknown) {
  const source = list(value);
  if (!source) return "The roster could not be saved.";
  const rows = [];
  for (const item of source) {
    if (!item || typeof item !== "object") return "Check the roster and try again.";
    const player = item as Record<string, unknown>;
    if (!isId(player.id)) return "Check the roster and try again.";
    const spot = position(player.position);
    const status = playerStatus(player.status);
    const number = jersey(player.number);
    const name = cleanText(player.name, 80);
    if (!name || !number || !spot || !status) return "Enter each player’s name, number, position, and status.";
    rows.push({
      id: player.id,
      accountEmail: cleanText(player.accountEmail, 160).toLowerCase(),
      name,
      number,
      position: spot,
      status,
      rating: cleanText(player.rating, 2),
      review: cleanText(player.review, 2000),
    });
  }
  return rows;
}

export async function teamForUser(userId: string, role: "coach" | "player") {
  if (role === "coach") {
    const [team] = await db.select().from(teams).where(eq(teams.coachUserId, userId)).limit(1);
    return team ?? null;
  }
  const [player] = await db.select().from(players).where(eq(players.userId, userId)).limit(1);
  if (!player) return null;
  const [team] = await db.select().from(teams).where(eq(teams.id, player.teamId)).limit(1);
  return team ?? null;
}

function playerView(player: PlayerRow) {
  return {
    id: player.id,
    name: player.name,
    number: player.number,
    position: player.position,
    status: player.status,
    rating: player.rating,
    review: player.review,
    ...(player.email ? { accountEmail: player.email } : {}),
  };
}

export async function workspaceFor(team: Team) {
  const [playerRows, eventRows, playRows, scoutRows] = await Promise.all([
    db.select().from(players).where(eq(players.teamId, team.id)),
    db.select().from(events).where(eq(events.teamId, team.id)),
    db.select().from(plays).where(eq(plays.teamId, team.id)),
    db.select().from(scouting).where(eq(scouting.teamId, team.id)),
  ]);
  return {
    profile: { name: team.coachName, email: team.coachEmail, teamName: team.name, season: team.season },
    teamCode: team.code,
    coachName: team.coachName,
    theme: { id: team.themeId, name: team.themeName, accent: team.accent, dark: team.dark },
    players: playerRows.map(playerView),
    events: eventRows.map((event) => ({
      id: event.id,
      title: event.title,
      type: event.type,
      date: event.date,
      time: event.time,
      location: event.location,
      notes: event.notes,
      lineup: event.lineup ?? [],
      ...(event.report ? { report: event.report } : {}),
    })),
    plays: playRows.map((play) => ({
      id: play.id,
      name: play.name,
      category: play.category,
      notes: play.notes,
      videoUrl: play.videoUrl,
      diagram: play.diagram,
    })),
    scouting: scoutRows.map((report) => ({
      id: report.id,
      opponent: report.opponent,
      record: report.record,
      offense: report.offense,
      defense: report.defense,
      keyPlayers: report.keyPlayers ?? [],
      keys: report.keys ?? [],
      notes: report.notes,
      updated: report.updated,
    })),
  };
}

export async function replaceEvents(teamId: string, value: unknown) {
  const parsed = parseEvents(value);
  if (typeof parsed === "string") return parsed;
  await db.transaction(async (tx) => {
    await tx.delete(events).where(eq(events.teamId, teamId));
    if (parsed.length) await tx.insert(events).values(parsed.map((event) => ({ ...event, teamId })));
  });
  return null;
}

export async function replacePlays(teamId: string, value: unknown) {
  const parsed = parsePlays(value);
  if (typeof parsed === "string") return parsed;
  await db.transaction(async (tx) => {
    await tx.delete(plays).where(eq(plays.teamId, teamId));
    if (parsed.length) await tx.insert(plays).values(parsed.map((play) => ({ ...play, teamId })));
  });
  return null;
}

export async function replaceScouting(teamId: string, value: unknown) {
  const parsed = parseScouting(value);
  if (typeof parsed === "string") return parsed;
  await db.transaction(async (tx) => {
    await tx.delete(scouting).where(eq(scouting.teamId, teamId));
    if (parsed.length) await tx.insert(scouting).values(parsed.map((report) => ({ ...report, teamId })));
  });
  return null;
}

export async function saveRoster(teamId: string, value: unknown) {
  const parsed = parseManualPlayers(value);
  if (typeof parsed === "string") return parsed;
  const existing = await db.select().from(players).where(eq(players.teamId, teamId));
  const accounts = existing.filter((player) => player.userId);
  const manuals = parsed.filter((player) => !player.accountEmail && !accounts.some((account) => account.id === player.id));
  const numbers = new Map<string, string>();
  for (const account of accounts) numbers.set(String(Number(account.number)), account.name);
  for (const player of manuals) {
    const owner = numbers.get(player.number);
    if (owner) return `#${player.number} is already taken by ${owner}.`;
    numbers.set(player.number, player.name);
  }
  await db.transaction(async (tx) => {
    for (const account of accounts) {
      const update = parsed.find((player) => player.id === account.id || player.accountEmail === account.email);
      await tx.update(players).set({
        status: update?.status ?? account.status,
        rating: update?.rating ?? account.rating,
        review: update?.review ?? account.review,
      }).where(eq(players.id, account.id));
    }
    const keep = new Set(manuals.map((player) => player.id));
    for (const current of existing) {
      if (!current.userId && !keep.has(current.id)) await tx.delete(players).where(eq(players.id, current.id));
    }
    for (const player of manuals) {
      const current = existing.find((item) => item.id === player.id);
      if (current?.userId) continue;
      const values = { name: player.name, number: player.number, position: player.position, status: player.status, rating: player.rating, review: player.review };
      if (current) await tx.update(players).set(values).where(and(eq(players.id, player.id), eq(players.teamId, teamId)));
      else await tx.insert(players).values({ id: player.id, teamId, userId: null, email: null, ...values });
    }
  });
  return null;
}

export async function savePlayerProfile(userId: string, name: string, number: string, spot: string) {
  const [player] = await db.select().from(players).where(eq(players.userId, userId)).limit(1);
  if (!player) return "Your player profile could not be found.";
  const roster = await db.select().from(players).where(eq(players.teamId, player.teamId));
  const taken = roster.find((item) => item.id !== player.id && sameJersey(item.number, number));
  if (taken) return `#${taken.number} is already taken by ${taken.name}.`;
  await db.update(players).set({ name, number, position: spot }).where(eq(players.id, player.id));
  return null;
}
