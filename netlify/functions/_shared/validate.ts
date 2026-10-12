const positions = new Set(["PG", "SG", "SF", "PF", "C"]);
const statuses = new Set(["Ready", "Limited", "Out"]);
const eventTypes = new Set(["Game", "Practice", "Film", "Meeting"]);
const playCategories = new Set(["Offense", "Defense", "Out of bounds", "Press break"]);
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function cleanText(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

export function isId(value: unknown): value is string {
  return typeof value === "string" && idPattern.test(value);
}

export function whole(value: unknown, max: number) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(number) || number < 0 || number > max) return null;
  return number;
}

export function jersey(value: unknown) {
  const text = cleanText(value, 2);
  if (!/^\d{1,2}$/.test(text)) return null;
  return String(Number(text));
}

export function sameJersey(a: string, b: string) {
  return a !== "" && b !== "" && Number(a) === Number(b);
}

export function position(value: unknown) {
  const text = cleanText(value, 2);
  return positions.has(text) ? text : null;
}

export function playerStatus(value: unknown) {
  const text = cleanText(value, 8);
  return statuses.has(text) ? text : null;
}

export function eventType(value: unknown) {
  const text = cleanText(value, 10);
  return eventTypes.has(text) ? text : null;
}

export function playCategory(value: unknown) {
  const text = cleanText(value, 20);
  return playCategories.has(text) ? text : null;
}

export function themeInput(value: unknown) {
  if (!value || typeof value !== "object") return "Choose a team colour.";
  const theme = value as Record<string, unknown>;
  if (typeof theme.accent !== "string" || !/^#[0-9a-f]{6}$/i.test(theme.accent)) return "Choose a valid team colour.";
  if (typeof theme.dark !== "string" || !/^#[0-9a-f]{6}$/i.test(theme.dark)) return "Choose a valid team colour.";
  if (typeof theme.id !== "string" || typeof theme.name !== "string") return "Choose a valid team colour.";
  return {
    id: theme.id.slice(0, 20),
    name: theme.name.slice(0, 40),
    accent: theme.accent.toLowerCase(),
    dark: theme.dark.toLowerCase(),
  };
}

export function teamDetails(value: unknown) {
  if (!value || typeof value !== "object") return "Enter the team name.";
  const details = value as Record<string, unknown>;
  const teamName = cleanText(details.teamName, 80);
  const season = cleanText(details.season, 4);
  if (!teamName) return "Enter the team name.";
  if (!/^\d{4}$/.test(season)) return "Enter the season as a four-digit year.";
  return { teamName, season };
}

export function profileDetails(value: unknown) {
  if (!value || typeof value !== "object") return "Enter your name and jersey number.";
  const details = value as Record<string, unknown>;
  const name = cleanText(details.name, 80);
  const number = jersey(details.number);
  const spot = position(details.position);
  if (!name || !number) return "Enter your name and jersey number.";
  if (!spot) return "Choose a position.";
  return { name, number, position: spot };
}
