import type { Config, Context } from "@netlify/functions";
import { getUser } from "@netlify/identity";
import { eq } from "drizzle-orm";
import { teams } from "../../db/schema";
import { db } from "./_shared/db";
import { forPlayer, replaceCoachNotes, replaceEvents, replacePlays, replaceScouting, savePlayerProfile, saveRoster, workspaceFor } from "./_shared/records";
import { ensureMembership } from "./_shared/signup";
import { profileDetails, teamDetails, themeInput } from "./_shared/validate";

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

function pathOf(req: Request) {
  const pathname = new URL(req.url).pathname;
  const marker = pathname.indexOf("/api/");
  return marker >= 0 ? pathname.slice(marker) : pathname;
}

async function member() {
  const user = await getUser();
  if (!user?.id || !user.email) return { error: json({ error: "Sign in to continue." }, 401) };
  const role = user.roles?.includes("coach") ? "coach" : user.roles?.includes("player") ? "player" : null;
  if (!role) return { error: json({ error: "This account is not linked to a team yet." }, 403) };
  const team = await ensureMembership(user);
  if (typeof team === "string") return { error: json({ error: team }, 400) };
  if (!team) return { error: json({ error: "Your team could not be found." }, 404) };
  return { user, role, team } as const;
}

async function readBody(req: Request) {
  const text = await req.text();
  if (!text) return {};
  return JSON.parse(text) as unknown;
}

export default async (req: Request, _context: Context) => {
  try {
    const path = pathOf(req);
    const access = await member();
    if ("error" in access) return access.error;
    const { user, role, team } = access;

    if (req.method === "GET" && path === "/api/workspace") {
      const workspace = await workspaceFor(team);
      return json({ ...(role === "player" ? forPlayer(workspace, user.email ?? "") : workspace), role });
    }

    if (role === "player") {
      if (req.method === "PATCH" && path === "/api/me") {
        const details = profileDetails(await readBody(req));
        if (typeof details === "string") return json({ error: details }, 400);
        const problem = await savePlayerProfile(user.id, details.name, details.number, details.position);
        if (problem) return json({ error: problem }, 400);
        return json({ ...forPlayer(await workspaceFor(team), user.email ?? ""), role });
      }
      return json({ error: "Players can view the team and update their own details." }, 403);
    }

    if (req.method === "PATCH" && path === "/api/team") {
      const details = teamDetails(await readBody(req));
      if (typeof details === "string") return json({ error: details }, 400);
      await db.update(teams).set({ name: details.teamName, season: details.season }).where(eq(teams.id, team.id));
      return json({ ok: true });
    }

    if (req.method === "PATCH" && path === "/api/theme") {
      const theme = themeInput(await readBody(req));
      if (typeof theme === "string") return json({ error: theme }, 400);
      await db.update(teams).set({
        accent: theme.accent,
        dark: theme.dark,
        themeId: theme.id,
        themeName: theme.name,
      }).where(eq(teams.id, team.id));
      return json({ ok: true });
    }

    if (req.method === "PUT" && path === "/api/events") {
      const problem = await replaceEvents(team.id, await readBody(req));
      return problem ? json({ error: problem }, 400) : json({ ok: true });
    }
    if (req.method === "PUT" && path === "/api/plays") {
      const problem = await replacePlays(team.id, await readBody(req));
      return problem ? json({ error: problem }, 400) : json({ ok: true });
    }
    if (req.method === "PUT" && path === "/api/players") {
      const problem = await saveRoster(team.id, await readBody(req));
      return problem ? json({ error: problem }, 400) : json({ ok: true });
    }
    if (req.method === "PUT" && path === "/api/scouting") {
      const problem = await replaceScouting(team.id, await readBody(req));
      return problem ? json({ error: problem }, 400) : json({ ok: true });
    }
    if (req.method === "PUT" && path === "/api/notes") {
      const problem = await replaceCoachNotes(team.id, await readBody(req));
      return problem ? json({ error: problem }, 400) : json({ ok: true });
    }

    return json({ error: "That action is not available." }, 404);
  } catch (error) {
    console.error(error);
    return json({ error: "Courtside could not complete that request. Try again." }, 500);
  }
};

export const config: Config = {
  path: "/api/*",
};
