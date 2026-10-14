import { eq } from "drizzle-orm";
import { players, teams } from "../../../db/schema";
import { db } from "./db";
import { cleanText, jersey, position, sameJersey } from "./validate";

type SignupUser = {
  id?: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

function makeTeamCode(teamName: string, taken: Set<string>) {
  const stem = (teamName.replace(/[^a-z]/gi, "").toUpperCase().slice(0, 4) || "TEAM").padEnd(4, "X");
  let code = "";
  do {
    code = `${stem}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  } while (taken.has(code));
  return code;
}

export async function createMembership(user: SignupUser) {
  if (!user.id || !user.email) return "The account could not be created.";
  const data = user.user_metadata ?? {};
  const name = cleanText(data.full_name, 80);
  if (!name) return "Enter your name.";
  if (data.role === "coach") {
    const teamName = cleanText(data.team_name, 80);
    const season = cleanText(data.season, 4);
    if (!teamName) return "Enter your name and your team name.";
    if (!/^\d{4}$/.test(season)) return "Enter the season as a four-digit year.";
    const existing = await db.select({ code: teams.code }).from(teams);
    const code = makeTeamCode(teamName, new Set(existing.map((team) => team.code)));
    await db.insert(teams).values({
      id: crypto.randomUUID(),
      name: teamName,
      season,
      code,
      accent: "#d9ff57",
      dark: "#101611",
      themeId: "lime",
      themeName: "Court Lime",
      coachUserId: user.id,
      coachName: name,
      coachEmail: user.email.toLowerCase(),
    });
    return { roles: ["coach"] };
  }
  const code = cleanText(data.team_code, 16).toUpperCase();
  const [team] = await db.select().from(teams).where(eq(teams.code, code)).limit(1);
  if (!team) return "That team code doesn’t match a coach. Ask your coach for the code on their roster page.";
  const number = jersey(data.number) ?? "";
  const roster = await db.select().from(players).where(eq(players.teamId, team.id));
  const taken = roster.find((player) => sameJersey(player.number, number));
  if (taken) return `#${taken.number} is already taken on this team. Pick another jersey number.`;
  await db.insert(players).values({
    id: crypto.randomUUID(),
    teamId: team.id,
    userId: user.id,
    email: user.email.toLowerCase(),
    name,
    number,
    position: position(data.position) ?? "PG",
    status: "Ready",
    rating: "",
    review: "",
  });
  return { roles: ["player"] };
}

export async function ensureMembership(user: { id: string; email?: string; name?: string; roles?: string[]; userMetadata?: Record<string, unknown> }) {
  const role = user.roles?.includes("player") ? "player" : user.roles?.includes("coach") ? "coach" : "";
  if (!role || !user.email) return "This account is not linked to a team yet.";
  const { teamForUser } = await import("./records");
  const existing = await teamForUser(user.id, role);
  if (existing) return existing;
  const metadata = { ...(user.userMetadata ?? {}), role, full_name: user.userMetadata?.full_name ?? user.name ?? "" };
  try {
    const result = await createMembership({ id: user.id, email: user.email, user_metadata: metadata });
    if (typeof result === "string") return result;
  } catch (error) {
    const again = await teamForUser(user.id, role);
    if (again) return again;
    throw error;
  }
  return await teamForUser(user.id, role) ?? "Your team could not be created.";
}
