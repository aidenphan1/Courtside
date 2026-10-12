import { eq } from "drizzle-orm";
import { players, teams } from "../../../db/schema";
import { db } from "./db";
import { cleanText, jersey, position, sameJersey } from "./validate";

type SignupUser = {
  id?: string;
  email?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
};

export function signupUser(body: string | null) {
  const parsed = JSON.parse(body || "{}") as { user?: SignupUser };
  return parsed.user ?? (parsed as SignupUser);
}

export function signupProblem(user: SignupUser) {
  const data = user.user_metadata ?? {};
  const role = data.role === "player" ? "player" : data.role === "coach" ? "coach" : "";
  const name = cleanText(data.full_name, 80);
  if (!name) return "Enter your name.";
  if (role === "coach") {
    const teamName = cleanText(data.team_name, 80);
    const season = cleanText(data.season, 4);
    if (!teamName) return "Enter your name and your team name.";
    if (!/^\d{4}$/.test(season)) return "Enter the season as a four-digit year.";
    return null;
  }
  if (role === "player") {
    const code = cleanText(data.team_code, 16).toUpperCase();
    const number = jersey(data.number);
    const spot = position(data.position);
    if (!number) return "Enter your name and jersey number.";
    if (!spot) return "Choose a position.";
    if (!code) return "Enter the team code from your coach.";
    return null;
  }
  return "Choose a coach or player account.";
}

function makeTeamCode(teamName: string, taken: Set<string>) {
  const stem = (teamName.replace(/[^a-z]/gi, "").toUpperCase().slice(0, 4) || "TEAM").padEnd(4, "X");
  let code = "";
  do {
    code = `${stem}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  } while (taken.has(code));
  return code;
}

export async function createMembership(user: SignupUser) {
  const problem = signupProblem(user);
  if (problem) return problem;
  if (!user.id || !user.email) return "The account could not be created.";
  const data = user.user_metadata ?? {};
  const name = cleanText(data.full_name, 80);
  if (data.role === "coach") {
    const existing = await db.select({ code: teams.code }).from(teams);
    const code = makeTeamCode(cleanText(data.team_name, 80), new Set(existing.map((team) => team.code)));
    await db.insert(teams).values({
      id: crypto.randomUUID(),
      name: cleanText(data.team_name, 80),
      season: cleanText(data.season, 4),
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
