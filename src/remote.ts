import {
  AuthError,
  getUser,
  handleAuthCallback,
  login,
  logout,
  MissingIdentityError,
  requestPasswordRecovery,
  signup,
  updateUser,
  type User,
} from "@netlify/identity";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type RemoteWorkspace = {
  role: "coach" | "player";
  profile: { name: string; email: string; teamName: string; season: string };
  teamCode: string;
  coachName: string;
  theme: { id: string; name: string; accent: string; dark: string };
  events: unknown[];
  plays: unknown[];
  players: unknown[];
  scouting: unknown[];
};

const publishedAccountMessage = "Real accounts are available on the published Netlify site. Use the demo on this computer, or open your Netlify URL.";

export function authMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof MissingIdentityError) return publishedAccountMessage;
  if (error instanceof AuthError) {
    if (error.message === "Not Found") return publishedAccountMessage;
    if (/user not found/i.test(error.message)) return "No account uses that email.";
    if (error.status === 401 || /invalid login/i.test(error.message)) return "That password doesn’t match this account.";
    if (error.status === 422) return error.message || "Check the form and try again.";
    return error.message || fallback;
  }
  if (error instanceof Error && /identity|failed to fetch/i.test(error.message)) return publishedAccountMessage;
  return fallback;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError(0, "You’re offline or the server could not be reached. Your latest change is still on this page.");
  }
  const text = await response.text();
  if (text.trim().startsWith("<")) {
    throw new ApiError(response.status, "The Courtside server is not available at this address yet.");
  }
  const body = text ? JSON.parse(text) as { error?: string } : {};
  if (!response.ok) throw new ApiError(response.status, body.error || "Courtside could not save that change.");
  return body as T;
}

export function startAuth() {
  return handleAuthCallback();
}

export function signedInUser() {
  return getUser();
}

export async function signIn(email: string, password: string) {
  return login(email.trim().toLowerCase(), password);
}

export async function signOutAccount() {
  try {
    await logout();
  } catch (error) {
    if (!(error instanceof MissingIdentityError)) throw error;
  }
}

export function sendRecovery(email: string) {
  return requestPasswordRecovery(email.trim().toLowerCase());
}

export function changePassword(password: string) {
  return updateUser({ password });
}

export function registerCoach(input: { name: string; email: string; password: string; teamName: string; season: string }) {
  return signup(input.email.trim().toLowerCase(), input.password, {
    full_name: input.name.trim(),
    role: "coach",
    team_name: input.teamName.trim(),
    season: input.season,
  });
}

export function registerPlayer(input: { name: string; email: string; password: string; number: string; position: string; teamCode: string }) {
  return signup(input.email.trim().toLowerCase(), input.password, {
    full_name: input.name.trim(),
    role: "player",
    number: input.number,
    position: input.position,
    team_code: input.teamCode.trim().toUpperCase(),
  });
}

export function accountReady(user: User) {
  return Boolean(user.confirmedAt);
}

export function accountRole(user: User) {
  if (user.roles?.includes("coach")) return "coach" as const;
  if (user.roles?.includes("player")) return "player" as const;
  return null;
}

export function fetchWorkspace() {
  return request<RemoteWorkspace>("/api/workspace");
}

export function saveEvents(events: unknown[]) {
  return request("/api/events", { method: "PUT", body: JSON.stringify(events) });
}

export function savePlays(plays: unknown[]) {
  return request("/api/plays", { method: "PUT", body: JSON.stringify(plays) });
}

export function savePlayers(players: unknown[]) {
  return request("/api/players", { method: "PUT", body: JSON.stringify(players) });
}

export function saveScouting(reports: unknown[]) {
  return request("/api/scouting", { method: "PUT", body: JSON.stringify(reports) });
}

export function saveTeamRemote(details: { teamName: string; season: string }) {
  return request("/api/team", { method: "PATCH", body: JSON.stringify(details) });
}

export function saveThemeRemote(theme: { id: string; name: string; accent: string; dark: string }) {
  return request("/api/theme", { method: "PATCH", body: JSON.stringify(theme) });
}

export function saveMyProfile(details: { name: string; number: string; position: string }) {
  return request<RemoteWorkspace>("/api/me", { method: "PATCH", body: JSON.stringify(details) });
}
