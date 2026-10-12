import type { Handler } from "@netlify/functions";
import { signupProblem, signupUser } from "./_shared/signup";
import { jersey, sameJersey } from "./_shared/validate";
import { eq } from "drizzle-orm";
import { players, teams } from "../../db/schema";
import { db } from "./_shared/db";

const handler: Handler = async (event) => {
  try {
    const user = signupUser(event.body);
    const problem = signupProblem(user);
    if (problem) return { statusCode: 422, body: problem };
    if (user.user_metadata?.role === "player") {
      const code = String(user.user_metadata.team_code ?? "").trim().toUpperCase();
      const [team] = await db.select().from(teams).where(eq(teams.code, code)).limit(1);
      if (!team) return { statusCode: 422, body: "That team code doesn’t match a coach. Ask your coach for the code on their roster page." };
      const number = jersey(user.user_metadata.number) ?? "";
      const roster = await db.select().from(players).where(eq(players.teamId, team.id));
      const taken = roster.find((player) => sameJersey(player.number, number));
      if (taken) return { statusCode: 422, body: `#${taken.number} is already taken on this team. Pick another jersey number.` };
    }
    return { statusCode: 200, body: "" };
  } catch (error) {
    console.error(error);
    return { statusCode: 503, body: "Courtside could not check that account. Try again in a moment." };
  }
};

export { handler };
