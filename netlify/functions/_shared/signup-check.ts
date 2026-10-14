type SignupUser = {
  id?: string;
  email?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
  userMetadata?: Record<string, unknown>;
  data?: Record<string, unknown>;
};

type IdentityEvent = { body?: string | null; isBase64Encoded?: boolean };

function decodeBody(body: string, encoded?: boolean) {
  if (!encoded) return body;
  const atob = (globalThis as { atob?: (value: string) => string }).atob;
  if (!atob) return body;
  const binary = atob(body);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function readSignup(event: IdentityEvent) {
  const parsed = JSON.parse(decodeBody(event.body || "{}", event.isBase64Encoded)) as { user?: SignupUser };
  const user = parsed.user ?? (parsed as SignupUser);
  const metadata = {
    ...(user.data ?? {}),
    ...(user.userMetadata ?? {}),
    ...(user.user_metadata ?? {}),
  };
  const role = metadata.role === "player" ? "player" : metadata.role === "coach" ? "coach" : "";
  return { ...user, user_metadata: metadata, role };
}

export function signupProblem(user: ReturnType<typeof readSignup>) {
  const data = user.user_metadata ?? {};
  const name = typeof data.full_name === "string" ? data.full_name.trim() : "";
  if (!name) return "Enter your name.";
  if (user.role === "coach") {
    const teamName = typeof data.team_name === "string" ? data.team_name.trim() : "";
    const season = typeof data.season === "string" ? data.season.trim() : "";
    if (!teamName) return "Enter your name and your team name.";
    if (!/^\d{4}$/.test(season)) return "Enter the season as a four-digit year.";
    return null;
  }
  if (user.role === "player") {
    const code = typeof data.team_code === "string" ? data.team_code.trim() : "";
    const number = typeof data.number === "string" ? data.number.trim() : "";
    const spot = typeof data.position === "string" ? data.position.trim() : "";
    if (!number) return "Enter your name and jersey number.";
    if (!spot) return "Choose a position.";
    if (!code) return "Enter the team code from your coach.";
    return null;
  }
  return "Choose a coach or player account.";
}
