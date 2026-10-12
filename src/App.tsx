import { FormEvent, PointerEvent as ReactPointerEvent, ReactNode, useEffect, useRef, useState } from "react";

// One-time wipe of the practice data entered while checking the site.
const freshStart = "courtside.fresh-start";
if (localStorage.getItem(freshStart) !== "2") {
  localStorage.setItem(freshStart, "2");
  window.setTimeout(() => {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("courtside.") && key !== freshStart) localStorage.removeItem(key);
    }
    sessionStorage.removeItem("courtside.session");
    location.reload();
  }, 50);
}
import {
  ArrowLeft,
  BarChart3,
  Bell,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Clock3,
  Eraser,
  FileText,
  ImagePlus,
  LayoutDashboard,
  LogOut,
  Menu,
  NotebookTabs,
  Palette,
  Pencil,
  Play,
  Plus,
  Printer,
  Settings,
  Trash2,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Undo2,
  UserRound,
  Users,
  X,
} from "lucide-react";

type Page = "Overview" | "Schedule" | "Results" | "Playbook" | "Roster" | "Scouting";

const navigation: { label: Page; icon: typeof LayoutDashboard }[] = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Schedule", icon: CalendarDays },
  { label: "Results", icon: Trophy },
  { label: "Playbook", icon: NotebookTabs },
  { label: "Roster", icon: Users },
  { label: "Scouting", icon: Target },
];

type Theme = { id: string; name: string; accent: string; dark: string };

const themes: Theme[] = [
  { id: "lime", name: "Court Lime", accent: "#d9ff57", dark: "#101611" },
  { id: "royal", name: "Royal Blue", accent: "#7cc4ff", dark: "#0d1524" },
  { id: "crimson", name: "Crimson", accent: "#ff6b6b", dark: "#1a0f11" },
  { id: "gold", name: "Gold", accent: "#ffc94a", dark: "#17130b" },
  { id: "purple", name: "Purple", accent: "#c3a1ff", dark: "#140f1f" },
  { id: "teal", name: "Teal", accent: "#4fe3c1", dark: "#0a1916" },
  { id: "orange", name: "Orange", accent: "#ff9f43", dark: "#1a120a" },
  { id: "silver", name: "Silver", accent: "#e3e7ee", dark: "#121417" },
];

type EventType = "Game" | "Practice" | "Film" | "Meeting";
type PlayCategory = "Offense" | "Defense" | "Out of bounds" | "Press break";
type PlayerStatus = "Ready" | "Limited" | "Out";
type Position = "PG" | "SG" | "SF" | "PF" | "C";

type ScheduleEvent = {
  id: string;
  title: string;
  type: EventType;
  date: string;
  time: string;
  location: string;
  notes: string;
  lineup?: string[];
  report?: GameReport;
};

const statColumns = [
  { key: "min", label: "MIN" },
  { key: "fgm", label: "FGM" },
  { key: "fga", label: "FGA" },
  { key: "tpm", label: "3PM" },
  { key: "tpa", label: "3PA" },
  { key: "ftm", label: "FTM" },
  { key: "fta", label: "FTA" },
  { key: "reb", label: "REB" },
  { key: "ast", label: "AST" },
  { key: "stl", label: "STL" },
  { key: "blk", label: "BLK" },
  { key: "tov", label: "TO" },
  { key: "pf", label: "PF" },
] as const;

type StatKey = (typeof statColumns)[number]["key"];

type StatLine = { playerId: string; name: string; number: string; played: boolean } & Record<StatKey, number>;

type GameReport = {
  teamScore: number;
  opponentScore: number;
  notes: string;
  stats: StatLine[];
};

type Play = {
  id: string;
  name: string;
  category: PlayCategory;
  notes: string;
  videoUrl: string;
  diagram: string;
};

type Player = {
  id: string;
  name: string;
  number: string;
  position: Position;
  status: PlayerStatus;
  rating: string;
  review: string;
  accountEmail?: string;
};

type ScoutPlayer = { number: string; name: string; note: string };

type ScoutReport = {
  id: string;
  opponent: string;
  record: string;
  offense: string;
  defense: string;
  keyPlayers: ScoutPlayer[];
  keys: string[];
  notes: string;
  updated: string;
};

type Dialog =
  | null
  | { type: "event-form"; draft?: ScheduleEvent }
  | { type: "event"; id: string }
  | { type: "play-form"; draft?: Play }
  | { type: "play"; id: string }
  | { type: "player-form"; draft?: Player }
  | { type: "player"; id: string }
  | { type: "reviews" }
  | { type: "report-form"; id: string }
  | { type: "report"; id: string }
  | { type: "scout-form"; draft?: ScoutReport; opponent?: string }
  | { type: "settings" };

const playFilters = ["All plays", "Offense", "Defense", "Out of bounds", "Press break"] as const;
const eventAccent: Record<EventType, string> = { Game: "lime", Practice: "blue", Film: "purple", Meeting: "orange" };

function loadList<T>(key: string): T[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

type CoachAccount = {
  name: string;
  email: string;
  passwordHash: string;
  teamName: string;
  season: string;
  teamCode: string;
};

type PlayerAccount = {
  name: string;
  email: string;
  passwordHash: string;
  teamCode: string;
  number: string;
  position: Position;
};

type CoachSession = { kind: "demo" } | { kind: "coach"; email: string } | { kind: "player"; email: string };
type WorkspaceSession = { kind: "demo" } | { kind: "coach"; email: string };

type CoachProfile = {
  name: string;
  teamName: string;
  season: string;
  demo: boolean;
};

const demoProfile: CoachProfile = { name: "Alex Carter", teamName: "Northside Ravens", season: "2026", demo: true };
const demoTeamCode = "RAVENS";

function loadAccounts() {
  return loadList<CoachAccount>("courtside.accounts");
}

function loadPlayerAccounts() {
  return loadList<PlayerAccount>("courtside.playerAccounts");
}

function loadSession(): CoachSession | null {
  try {
    const parsed = JSON.parse(sessionStorage.getItem("courtside.session") ?? "null") as CoachSession | null;
    if (parsed?.kind === "demo") return { kind: "demo" };
    if ((parsed?.kind === "coach" || parsed?.kind === "player") && typeof parsed.email === "string") return parsed;
  } catch {
    return null;
  }
  return null;
}

function dataKey(session: WorkspaceSession, kind: "events" | "plays" | "players" | "scouting") {
  if (session.kind === "demo") return `courtside.${kind}`;
  return `courtside.${encodeURIComponent(session.email)}.${kind}`;
}

function demoDetails() {
  try {
    const parsed = JSON.parse(localStorage.getItem("courtside.demo.details") ?? "null") as { teamName?: string; season?: string } | null;
    if (parsed?.teamName?.trim()) {
      return {
        teamName: parsed.teamName.trim(),
        season: parsed.season?.trim() || demoProfile.season,
      };
    }
  } catch {
    /* keep the built-in demo team */
  }
  return { teamName: demoProfile.teamName, season: demoProfile.season };
}

function profileFor(session: CoachSession): CoachProfile {
  if (session.kind !== "coach") return { ...demoProfile, ...demoDetails() };
  const account = loadAccounts().find((item) => item.email === session.email);
  if (!account) return demoProfile;
  return { name: account.name, teamName: account.teamName, season: account.season, demo: false };
}

function saveTeamDetails(session: WorkspaceSession, details: { teamName: string; season: string }) {
  if (session.kind === "demo") {
    localStorage.setItem("courtside.demo.details", JSON.stringify(details));
    return;
  }
  const accounts = loadAccounts();
  const account = accounts.find((item) => item.email === session.email);
  if (!account) return;
  account.teamName = details.teamName;
  account.season = details.season;
  localStorage.setItem("courtside.accounts", JSON.stringify(accounts));
}

function makeTeamCode(teamName: string) {
  const taken = new Set([demoTeamCode, ...loadAccounts().map((account) => account.teamCode).filter(Boolean)]);
  const stem = (teamName.replace(/[^a-z]/gi, "").toUpperCase().slice(0, 4) || "TEAM").padEnd(4, "X");
  let code = "";
  do {
    code = `${stem}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  } while (taken.has(code));
  return code;
}

function ensureTeamCode(email: string) {
  const accounts = loadAccounts();
  const account = accounts.find((item) => item.email === email);
  if (!account) return demoTeamCode;
  if (account.teamCode) return account.teamCode;
  account.teamCode = makeTeamCode(account.teamName);
  localStorage.setItem("courtside.accounts", JSON.stringify(accounts));
  return account.teamCode;
}

function teamCodeFor(session: WorkspaceSession) {
  return session.kind === "demo" ? demoTeamCode : ensureTeamCode(session.email);
}

function teamByCode(code: string) {
  const normalized = code.trim().toUpperCase();
  if (normalized === demoTeamCode) {
    const details = demoDetails();
    return { code: demoTeamCode, name: details.teamName, coach: demoProfile.name, season: details.season, eventsKey: "courtside.events", playsKey: "courtside.plays", playersKey: "courtside.players" };
  }
  const account = loadAccounts().find((item) => item.teamCode === normalized);
  if (!account) return null;
  const prefix = `courtside.${encodeURIComponent(account.email)}`;
  return { code: normalized, name: account.teamName, coach: account.name, season: account.season, eventsKey: `${prefix}.events`, playsKey: `${prefix}.plays`, playersKey: `${prefix}.players` };
}

function mergeRoster(teamCode: string, existing: Player[]) {
  const joined = loadPlayerAccounts().filter((account) => account.teamCode === teamCode);
  const linked = joined.map((account) => {
    const current = existing.find((player) => player.accountEmail === account.email);
    return {
      id: current?.id ?? `acct:${account.email}`,
      accountEmail: account.email,
      name: account.name,
      number: account.number,
      position: account.position,
      status: current?.status ?? "Ready",
      rating: current?.rating ?? "",
      review: current?.review ?? "",
    } satisfies Player;
  });
  const manual = existing.filter((player) => !player.accountEmail);
  const next = [...linked, ...manual];
  const signature = (list: Player[]) => JSON.stringify(list.map((player) => [player.id, player.accountEmail ?? "", player.name, player.number, player.position, player.status, player.rating, player.review]));
  return signature(next) === signature(existing) ? existing : next;
}

async function hashPassword(password: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";
}

function formatTime(value: string) {
  const [hourText, minute] = value.split(":");
  const hour = Number(hourText);
  if (!minute || Number.isNaN(hour)) return value;
  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? "PM" : "AM"}`;
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return { day: "", date: "", label: value };
  return {
    day: date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
    date: String(date.getDate()),
    label: date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
  };
}

function todayISO() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function isRealDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function nowTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function whenProblem(date: string, time: string) {
  if (!isRealDate(date)) return "That date isn’t a real calendar day.";
  const today = todayISO();
  if (date < today) return "Choose today or a future date.";
  if (date === today && time && time < nowTime()) return "That time has already passed today.";
  return "";
}

function hasStarted(event: ScheduleEvent) {
  const today = todayISO();
  return event.date < today || (event.date === today && event.time <= nowTime());
}

function canReport(event: ScheduleEvent) {
  return event.type === "Game" && hasStarted(event);
}

function isResult(event: ScheduleEvent) {
  return event.type === "Game" && (hasStarted(event) || Boolean(event.report));
}

function isUpcoming(event: ScheduleEvent) {
  return !hasStarted(event) && !event.report;
}

function seasonRecord(events: ScheduleEvent[]) {
  const reports = events.flatMap((event) => event.report ? [event.report] : []);
  const wins = reports.filter((report) => resultOf(report) === "W").length;
  const losses = reports.filter((report) => resultOf(report) === "L").length;
  const ties = reports.length - wins - losses;
  const scored = reports.reduce((total, report) => total + report.teamScore, 0);
  const allowed = reports.reduce((total, report) => total + report.opponentScore, 0);
  return {
    games: reports.length,
    wins,
    losses,
    ties,
    label: `${wins}–${losses}${ties ? `–${ties}` : ""}`,
    ppg: reports.length ? (scored / reports.length).toFixed(1) : "—",
    oppg: reports.length ? (allowed / reports.length).toFixed(1) : "—",
    margin: reports.length ? ((scored - allowed) / reports.length).toFixed(1) : "—",
  };
}

function hexToRgb(hex: string) {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
  const number = parseInt(full, 16);
  return [(number >> 16) & 255, (number >> 8) & 255, number & 255];
}

function mixHex(a: string, b: string, amount: number) {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const mix = (x: number, y: number) => Math.round(x + (y - x) * amount).toString(16).padStart(2, "0");
  return `#${mix(r1, r2)}${mix(g1, g2)}${mix(b1, b2)}`;
}

function inkFor(hex: string) {
  const [r, g, b] = hexToRgb(hex).map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? "#111611" : "#ffffff";
}

function themeKey(code: string) {
  return `courtside.theme.${code}`;
}

function loadTheme(code: string): Theme {
  try {
    const saved = JSON.parse(localStorage.getItem(themeKey(code)) ?? "null") as Theme | null;
    if (saved && /^#[0-9a-f]{6}$/i.test(saved.accent) && /^#[0-9a-f]{6}$/i.test(saved.dark)) return saved;
  } catch {
    return themes[0];
  }
  return themes[0];
}

function customTheme(accent: string): Theme {
  return { id: "custom", name: "Custom", accent, dark: mixHex("#0c0e0c", accent, 0.1) };
}

function applyTheme(theme: Theme) {
  const root = document.documentElement.style;
  root.setProperty("--accent", theme.accent);
  root.setProperty("--accent-ink", inkFor(theme.accent));
  root.setProperty("--dark", theme.dark);
}

function opponentName(title: string) {
  return title.replace(/^(vs\.?|v\.?|@|at)\s+/i, "").trim() || title;
}

function points(line: StatLine) {
  return (line.fgm - line.tpm) * 2 + line.tpm * 3 + line.ftm;
}

function pct(made: number, attempted: number) {
  return attempted === 0 ? "—" : `${Math.round((made / attempted) * 100)}%`;
}

function teamTotals(report: GameReport) {
  const played = report.stats.filter((line) => line.played);
  const sum = (key: StatKey) => played.reduce((total, line) => total + line[key], 0);
  return {
    pts: played.reduce((total, line) => total + points(line), 0),
    fgm: sum("fgm"), fga: sum("fga"), tpm: sum("tpm"), tpa: sum("tpa"), ftm: sum("ftm"), fta: sum("fta"),
    reb: sum("reb"), ast: sum("ast"), stl: sum("stl"), blk: sum("blk"), tov: sum("tov"), pf: sum("pf"),
  };
}

function resultOf(report: GameReport) {
  if (report.teamScore > report.opponentScore) return "W";
  if (report.teamScore < report.opponentScore) return "L";
  return "T";
}

function latestReported(events: ScheduleEvent[]) {
  return events
    .filter((event) => event.report)
    .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`))[0];
}

function bySchedule(a: ScheduleEvent, b: ScheduleEvent) {
  return `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`);
}

function byRecent(a: ScheduleEvent, b: ScheduleEvent) {
  return `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`);
}

function digits(value: string, max: number) {
  return value.replace(/\D/g, "").slice(0, max);
}

function daysUntil(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const target = new Date(year, month - 1, day).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((target - today) / 86_400_000);
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

type Task = { id: string; title: string; detail: string; go: () => void };

function buildTasks(
  events: ScheduleEvent[],
  players: Player[],
  scouting: ScoutReport[],
  open: { result: (id: string) => void; event: (id: string) => void; roster: () => void; scout: (opponent: string) => void },
) {
  const tasks: Task[] = [];
  for (const event of events.filter((item) => canReport(item) && !item.report).sort(byRecent)) {
    tasks.push({ id: `r-${event.id}`, title: `Enter the result for ${event.title}`, detail: `${formatDate(event.date).label} · score and box score`, go: () => open.result(event.id) });
  }
  const soon = events.filter((item) => isUpcoming(item) && daysUntil(item.date) <= 7).sort(bySchedule);
  for (const event of soon.filter((item) => item.type === "Game" && (item.lineup ?? []).length === 0)) {
    tasks.push({ id: `l-${event.id}`, title: `Pick the lineup for ${event.title}`, detail: `${formatDate(event.date).label} · ${players.length} on the roster`, go: () => open.event(event.id) });
  }
  for (const event of soon.filter((item) => item.type === "Game" && !scouting.some((report) => sameOpponent(report.opponent, item.title)))) {
    tasks.push({ id: `s-${event.id}`, title: `Scout ${opponentName(event.title)}`, detail: `Before ${formatDate(event.date).label}`, go: () => open.scout(opponentName(event.title)) });
  }
  for (const event of soon.filter((item) => !item.notes)) {
    tasks.push({ id: `n-${event.id}`, title: `Add notes for ${event.title}`, detail: "Players see these before they arrive", go: () => open.event(event.id) });
  }
  const unreviewed = players.filter((player) => !player.review).length;
  if (unreviewed > 0) {
    tasks.push({ id: "reviews", title: `Write ${unreviewed} player review${unreviewed === 1 ? "" : "s"}`, detail: "Feedback shows on each player’s home", go: open.roster });
  }
  return tasks;
}

function sameOpponent(a: string, b: string) {
  return opponentName(a).toLowerCase() === opponentName(b).toLowerCase();
}

type VideoEmbed = { src: string; thumb: string | null; kind: "youtube" | "vimeo" | "file" };

function videoEmbed(url: string): VideoEmbed | null {
  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id ? { kind: "youtube", src: `https://www.youtube-nocookie.com/embed/${id}`, thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` } : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      const fromQuery = parsed.searchParams.get("v");
      const fromPath = parsed.pathname.split("/").filter(Boolean).pop();
      const id = fromQuery || (fromPath && fromPath !== "watch" ? fromPath : "");
      return id ? { kind: "youtube", src: `https://www.youtube-nocookie.com/embed/${id}`, thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` } : null;
    }
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const id = parsed.pathname.split("/").find((part) => /^\d+$/.test(part));
      return id ? { kind: "vimeo", src: `https://player.vimeo.com/video/${id}`, thumb: null } : null;
    }
    if (/\.(mp4|webm|ogg)$/i.test(parsed.pathname)) return { kind: "file", src: parsed.toString(), thumb: null };
  } catch {
    return null;
  }
  return null;
}

function PlayVideo({ url }: { url: string }) {
  const embed = videoEmbed(url);
  if (!embed) return null;
  if (embed.kind === "file") return <video className="play-video" controls src={embed.src} />;
  return (
    <iframe
      className="play-video"
      src={embed.src}
      title="Play video"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
    />
  );
}

function PlayArt({ play }: { play: Play }) {
  const embed = play.videoUrl ? videoEmbed(play.videoUrl) : null;
  const [vimeoThumb, setVimeoThumb] = useState("");

  useEffect(() => {
    if (embed?.kind !== "vimeo" || !play.videoUrl) return;
    const controller = new AbortController();
    fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(play.videoUrl)}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((data: { thumbnail_url?: string }) => setVimeoThumb(data.thumbnail_url ?? ""))
      .catch(() => {});
    return () => controller.abort();
  }, [play.videoUrl, embed?.kind]);

  if (embed?.thumb) return <img className="play-thumb" src={embed.thumb} alt="" />;
  if (vimeoThumb) return <img className="play-thumb" src={vimeoThumb} alt="" />;
  if (embed?.kind === "file") return <video className="play-thumb" src={`${embed.src}#t=0.1`} muted playsInline preload="metadata" />;
  if (play.diagram) return <img className="play-thumb" src={play.diagram} alt="" />;
  return <MiniCourt />;
}

function Logo() {
  return (
    <div className="logo">
      <span className="logo-mark"><span /></span>
      <span>COURTSIDE</span>
    </div>
  );
}

function Sidebar({
  page,
  setPage,
  open,
  setOpen,
  onSignOut,
  onSettings,
  rosterCount,
  resultsDue,
  profile,
  events,
}: {
  page: Page;
  setPage: (page: Page) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  onSignOut: () => void;
  onSettings: () => void;
  rosterCount: number;
  resultsDue: number;
  profile: CoachProfile;
  events: ScheduleEvent[];
}) {
  const record = seasonRecord(events);
  const remaining = events.filter((event) => event.type === "Game" && isUpcoming(event)).length;
  const total = record.games + remaining;

  return (
    <>
      <aside className={`sidebar ${open ? "is-open" : ""}`}>
        <div className="sidebar-top">
          <Logo />
          <button className="icon-button mobile-close" onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={19} />
          </button>
        </div>

        <button className="team-switcher" onClick={onSettings} aria-label="Team settings">
          <div className="team-badge">{initials(profile.teamName)}</div>
          <div>
            <strong>{profile.teamName}</strong>
            <span>{profile.season}</span>
          </div>
          <Palette size={16} />
        </button>

        <nav>
          <p className="eyebrow nav-label">Workspace</p>
          {navigation.map(({ label, icon: Icon }) => (
            <button
              className={`nav-item ${page === label ? "active" : ""}`}
              key={label}
              onClick={() => {
                setPage(label);
                setOpen(false);
              }}
            >
              <Icon size={19} strokeWidth={1.8} />
              <span>{label}</span>
              {label === "Roster" && <small>{rosterCount}</small>}
              {label === "Results" && resultsDue > 0 && <small className="is-due">{resultsDue}</small>}
            </button>
          ))}
        </nav>

        <div className="sidebar-spacer" />
        <button className="season-card" onClick={() => { setPage("Results"); setOpen(false); }}>
          <div className="season-head">
            <div className="season-icon"><Trophy size={17} /></div>
            <div>
              <span>{profile.season} season</span>
              <strong>{record.games === 0 ? "No results yet" : record.label}</strong>
            </div>
          </div>
          <div className="progress"><span style={{ width: `${total ? Math.round((record.games / total) * 100) : 0}%` }} /></div>
          <small>{remaining === 0 ? "No games left on the schedule" : `${remaining} game${remaining === 1 ? "" : "s"} remaining`}</small>
        </button>
        <button className="nav-item" onClick={onSettings}><Settings size={19} /><span>Settings</span></button>
        <button className="nav-item" onClick={onSignOut}><LogOut size={19} /><span>Sign out</span></button>
        <div className="coach-profile">
          <div className="avatar">{initials(profile.name)}</div>
          <div><strong>{profile.name}</strong><span>Head coach</span></div>
        </div>
      </aside>
      {open && <button className="backdrop" onClick={() => setOpen(false)} aria-label="Close menu" />}
    </>
  );
}

function Header({
  page,
  onMenu,
  profile,
  tasks,
}: {
  page: Page;
  onMenu: () => void;
  profile: CoachProfile;
  tasks: Task[];
}) {
  const [noticesOpen, setNoticesOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!noticesOpen) return;
    function close(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setNoticesOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [noticesOpen]);

  return (
    <header className="topbar">
      <button className="icon-button menu-button" onClick={onMenu} aria-label="Open menu"><Menu size={20} /></button>
      <div>
        <p className="eyebrow">{profile.teamName} · {profile.season}</p>
        <h1>{page}</h1>
      </div>
      <div className="topbar-actions">
        <div className="notice-wrap" ref={wrapRef}>
          <button className="icon-button notification" aria-label={`Notifications${tasks.length ? `, ${tasks.length} to do` : ""}`} aria-expanded={noticesOpen} onClick={() => setNoticesOpen((open) => !open)}>
            <Bell size={19} />
            {tasks.length > 0 && <span>{tasks.length > 9 ? "9+" : tasks.length}</span>}
          </button>
          {noticesOpen && (
            <div className="notice-pop" role="dialog" aria-label="Notifications">
              <strong>{tasks.length === 0 ? "You’re all caught up" : `${tasks.length} thing${tasks.length === 1 ? "" : "s"} to do`}</strong>
              {tasks.length === 0 ? (
                <p>Results to enter, lineups to pick, and reviews to write will show up here.</p>
              ) : (
                <div className="notice-list">
                  {tasks.slice(0, 6).map((task) => (
                    <button key={task.id} onClick={() => { setNoticesOpen(false); task.go(); }}>
                      <strong>{task.title}</strong>
                      <small>{task.detail}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function MiniCourt() {
  return (
    <div className="mini-court" aria-label="Basketball play diagram">
      <div className="court-half-circle" />
      <div className="court-key"><span /></div>
      <div className="court-arc" />
      <span className="player-dot p1">1</span>
      <span className="player-dot p2">2</span>
      <span className="player-dot p3">3</span>
      <span className="player-dot p4">4</span>
      <span className="player-dot p5">5</span>
      <svg className="play-line" viewBox="0 0 300 150" role="presentation">
        <path d="M148 122 C 157 101, 180 88, 205 71" />
        <path d="M201 68 l10 1 -5 8" />
        <path className="dashed" d="M87 99 C 112 79, 137 73, 165 77" />
      </svg>
    </div>
  );
}

function Overview({
  events,
  plays,
  players,
  setPage,
  onAdd,
  onOpenEvent,
  onOpenReport,
  profile,
  tasks,
  scouting,
}: {
  events: ScheduleEvent[];
  plays: Play[];
  players: Player[];
  setPage: (page: Page) => void;
  onAdd: (kind: "event" | "play" | "player") => void;
  onOpenEvent: (id: string) => void;
  onOpenReport: (id: string) => void;
  profile: CoachProfile;
  tasks: Task[];
  scouting: ScoutReport[];
}) {
  const upcoming = events.filter(isUpcoming).sort(bySchedule);
  const next = upcoming[0];
  const nextGame = upcoming.find((event) => event.type === "Game");
  const lastGame = latestReported(events);
  const lastTotals = lastGame?.report ? teamTotals(lastGame.report) : null;
  const latestPlay = plays[0];
  const reviewsLeft = players.filter((player) => !player.review).length;
  const nextDate = next ? formatDate(next.date) : null;
  const record = seasonRecord(events);
  const scoutedNext = nextGame ? scouting.some((report) => sameOpponent(report.opponent, nextGame.title)) : false;
  const thisWeek = upcoming.filter((event) => daysUntil(event.date) <= 7).length;
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow light">{today}</p>
          <h2>{greeting()}, Coach {profile.name.split(" ").slice(-1)[0]}.</h2>
          <p>{thisWeek === 0 ? "Nothing on the calendar this week yet." : `${thisWeek} event${thisWeek === 1 ? "" : "s"} in the next 7 days.`} {tasks.length ? `${tasks.length} item${tasks.length === 1 ? "" : "s"} need your attention.` : "You’re all caught up."}</p>
        </div>
        <div className="hero-record">
          <div><span>Record</span><strong>{record.games ? record.label : "0–0"}</strong></div>
          <div><span>Points / game</span><strong>{record.ppg}</strong></div>
          <div><span>Avg margin</span><strong>{record.games && Number(record.margin) > 0 ? `+${record.margin}` : record.margin}</strong></div>
        </div>
      </section>

      <section className="stat-grid">
        <button className="stat-card" onClick={() => setPage("Schedule")}>
          <div className="stat-icon lime"><CalendarDays size={21} /></div>
          <div>
            <span>Next event</span>
            <strong>{next ? nextDate?.label : "Nothing scheduled"}</strong>
            <small>{next ? `${next.title} · ${formatTime(next.time)}` : "Add a game or practice"}</small>
          </div>
          <ChevronRight size={18} />
        </button>
        <button className="stat-card" onClick={() => setPage("Roster")}>
          <div className="stat-icon blue"><ClipboardList size={21} /></div>
          <div>
            <span>Roster</span>
            <strong>{players.length === 0 ? "No players yet" : `${players.length} player${players.length === 1 ? "" : "s"}`}</strong>
            <small>{players.length === 0 ? "Share your team code" : reviewsLeft ? `${reviewsLeft} still need a review` : "Everyone has feedback"}</small>
          </div>
          <ChevronRight size={18} />
        </button>
        <button className="stat-card" onClick={() => setPage("Scouting")}>
          <div className="stat-icon orange"><Target size={21} /></div>
          <div>
            <span>Scouting</span>
            <strong>{nextGame ? (scoutedNext ? "Report ready" : "Not scouted yet") : `${scouting.length} report${scouting.length === 1 ? "" : "s"}`}</strong>
            <small>{nextGame ? opponentName(nextGame.title) : "No game coming up"}</small>
          </div>
          <ChevronRight size={18} />
        </button>
      </section>

      <section className="dashboard-grid">
        <article className="panel next-game-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">Next game</p><h3>{nextGame ? (daysUntil(nextGame.date) === 0 ? "Game day" : `${daysUntil(nextGame.date)} day${daysUntil(nextGame.date) === 1 ? "" : "s"} to go`) : "Game day countdown"}</h3></div>
            <button className="text-button" onClick={() => setPage("Schedule")}>View schedule <ChevronRight size={15} /></button>
          </div>
          {nextGame ? (
            <>
              <div className="matchup">
                <div className="team team-home"><div className="large-badge raven">{initials(profile.teamName)}</div><strong>{profile.teamName}</strong><span>Home</span></div>
                <div className="versus">
                  <p>{formatDate(nextGame.date).label}</p><strong>{formatTime(nextGame.time).split(" ")[0]}</strong><span>{formatTime(nextGame.time).split(" ")[1]}</span><small>{nextGame.location}</small>
                </div>
                <div className="team"><div className="large-badge tiger">{initials(opponentName(nextGame.title))}</div><strong>{opponentName(nextGame.title)}</strong><span>Opponent</span></div>
              </div>
              <div className="game-meta">
                <span><Users size={15} /> {(nextGame.lineup ?? []).length ? `${nextGame.lineup?.length} selected` : "Lineup not picked"}</span>
                <span><ShieldCheck size={15} /> {scoutedNext ? "Scouted" : "Not scouted"}</span>
                <button onClick={() => onOpenEvent(nextGame.id)}>Open game</button>
              </div>
            </>
          ) : (
            <div className="panel-empty">
              <p>No games on the schedule. Add one to start the countdown.</p>
              <button className="primary-button" onClick={() => onAdd("event")}><Plus size={16} /> Add a game</button>
            </div>
          )}
        </article>

        <article className="panel tasks-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">Focus</p><h3>Coach’s checklist</h3></div>
            <span className="counter">{tasks.length === 0 ? "Clear" : `${tasks.length} open`}</span>
          </div>
          {tasks.length === 0 ? (
            <div className="panel-empty">
              <p>Nothing waiting on you. Results, lineups, scouting, and reviews show up here when they’re due.</p>
            </div>
          ) : (
            tasks.slice(0, 7).map((task) => (
              <button className="task" key={task.id} onClick={task.go}>
                <span className="custom-check" />
                <span><strong>{task.title}</strong><small>{task.detail}</small></span>
                <ChevronRight size={15} />
              </button>
            ))
          )}
        </article>

        <article className="panel play-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">Playbook</p><h3>Recently edited</h3></div>
            <button className="text-button" onClick={() => setPage("Playbook")}>All plays <ChevronRight size={15} /></button>
          </div>
          {latestPlay ? (
            <>
              <div className="diagram overview-art"><PlayArt play={latestPlay} /></div>
              <div className="play-footer">
                <div><span className="tag">{latestPlay.category}</span><h4>{latestPlay.name}</h4><p>{latestPlay.notes || "No notes yet"}</p></div>
                <button className="round-play" onClick={() => setPage("Playbook")} aria-label="Open play"><Play size={18} fill="currentColor" /></button>
              </div>
            </>
          ) : (
            <div className="panel-empty">
              <p>No plays in the book yet.</p>
              <button className="primary-button" onClick={() => onAdd("play")}><Plus size={16} /> New play</button>
            </div>
          )}
        </article>

        <article className="panel performance-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">Last game</p><h3>Team performance</h3></div>
            {lastGame?.report && <span className={`result-pill result-${resultOf(lastGame.report)}`}>{resultOf(lastGame.report)}&nbsp; {lastGame.report.teamScore}–{lastGame.report.opponentScore}</span>}
          </div>
          {lastGame?.report && lastTotals ? (
            <>
              <div className="performance-score">
                <div><span>vs. {opponentName(lastGame.title)}</span><strong>{lastGame.report.teamScore}</strong><small> pts</small></div>
                <div className="trend"><TrendingUp size={17} /> {formatDate(lastGame.date).label}</div>
              </div>
              <div className="metrics">
                <div><span>FG%</span><strong>{pct(lastTotals.fgm, lastTotals.fga)}</strong><i style={{ width: `${lastTotals.fga ? Math.round((lastTotals.fgm / lastTotals.fga) * 100) : 0}%` }} /></div>
                <div><span>Rebounds</span><strong>{lastTotals.reb}</strong><i style={{ width: `${Math.min(100, Math.round((lastTotals.reb / 50) * 100))}%` }} /></div>
                <div><span>Assists</span><strong>{lastTotals.ast}</strong><i style={{ width: `${Math.min(100, Math.round((lastTotals.ast / 30) * 100))}%` }} /></div>
              </div>
              <button className="secondary-button" onClick={() => onOpenReport(lastGame.id)}><BarChart3 size={17} /> Open game report</button>
            </>
          ) : (
            <div className="panel-empty">
              <p>No results yet. After a game, enter the score and box score on the Results page.</p>
              <button className="primary-button" onClick={() => setPage("Results")}><Trophy size={16} /> Go to results</button>
            </div>
          )}
        </article>
      </section>
    </>
  );
}

function Modal({ title, onClose, wide, children }: { title: string; onClose: () => void; wide?: boolean; children: ReactNode }) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal ${wide ? "is-wide" : ""}`} role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function EventForm({ initial, onCancel, onSave }: { initial?: ScheduleEvent; onCancel: () => void; onSave: (event: ScheduleEvent) => void }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [type, setType] = useState<EventType>(initial?.type ?? "Game");
  const [date, setDate] = useState(initial?.date ?? "");
  const [time, setTime] = useState(initial?.time ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState("");
  const unchanged = Boolean(initial) && date === initial?.date && time === initial?.time;
  const yearTyped = Number(date.slice(0, 4)) >= 1000;
  const whenError = date && yearTyped && !unchanged ? whenProblem(date, time) : "";

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !date || !time || !location.trim()) {
      setError("Fill in the title, date, time, and location.");
      return;
    }
    const problem = unchanged ? "" : whenProblem(date, time);
    if (problem) {
      setError(problem);
      return;
    }
    onSave({
      ...initial,
      id: initial?.id ?? crypto.randomUUID(),
      title: title.trim(),
      type,
      date,
      time,
      location: location.trim(),
      notes: notes.trim(),
    });
  }

  return (
    <form onSubmit={submit}>
      <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="vs. Eastview Tigers" /></label>
      <label>Type
        <select value={type} onChange={(event) => setType(event.target.value as EventType)}>
          {(["Game", "Practice", "Film", "Meeting"] as EventType[]).map((option) => <option key={option}>{option}</option>)}
        </select>
      </label>
      <div className="field-row">
        <label>Date<input type="date" min={initial && initial.date < todayISO() ? initial.date : todayISO()} value={date} aria-invalid={Boolean(whenError)} onChange={(event) => {
          setError("");
          setDate(event.target.value);
        }} /></label>
        <label>Time<input type="time" value={time} aria-invalid={Boolean(whenError)} onChange={(event) => {
          setError("");
          setTime(event.target.value);
        }} /></label>
      </div>
      {whenError && !error && <p className="field-error">{whenError}</p>}
      <label>Location<input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Main gym" /></label>
      <label>Coach notes
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="What players should know before this event." />
      </label>
      <p className="field-hint">Players will see these notes with the event.</p>
      {error && <p className="field-error">{error}</p>}
      <div className="modal-actions">
        <button className="secondary-button" type="button" onClick={onCancel}>Cancel</button>
        <button className="primary-button" type="submit" disabled={Boolean(whenError)}>Save event</button>
      </div>
    </form>
  );
}

function linesForLineup(event: ScheduleEvent, players: Player[]) {
  const saved = event.report?.stats ?? [];
  return (event.lineup ?? []).flatMap((id) => {
    const player = players.find((item) => item.id === id);
    if (!player) return [];
    const line = saved.find((item) => item.playerId === id);
    return [line ? { ...line, name: player.name, number: player.number } : blankLine(player)];
  });
}

function blankLine(player: Player): StatLine {
  const line = { playerId: player.id, name: player.name, number: player.number, played: true } as StatLine;
  for (const column of statColumns) line[column.key] = 0;
  return line;
}

function LineupPicker({ players, lineup, onChange }: { players: Player[]; lineup: string[]; onChange: (ids: string[]) => void }) {
  const ordered = [...players].sort((a, b) => Number(a.status === "Out") - Number(b.status === "Out"));

  return (
    <div className="lineup">
      <div className="report-section-head">
        <h4>Who’s playing</h4>
        <span>{lineup.length} selected</span>
      </div>
      {ordered.length === 0 ? (
        <p className="field-hint">Nobody is on the roster yet. Players show up here after they create an account with your team code.</p>
      ) : (
        <div className="lineup-grid">
          {ordered.map((player) => {
            const selected = lineup.includes(player.id);
            return (
              <label key={player.id} className={selected ? "is-on" : ""}>
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={(event) => onChange(event.target.checked ? [...lineup, player.id] : lineup.filter((id) => id !== player.id))}
                />
                <span className="jersey">{player.number || "–"}</span>
                <span>
                  <strong>{player.name}</strong>
                  <small>{player.position}{player.status === "Out" ? " · Out" : ""}{player.accountEmail ? " · Account" : ""}</small>
                </span>
              </label>
            );
          })}
        </div>
      )}
      <p className="field-hint">Only the players you tick are in this game’s box score.</p>
    </div>
  );
}

function ReportForm({
  event,
  players,
  teamName,
  onCancel,
  onSave,
  onLineup,
}: {
  event: ScheduleEvent;
  players: Player[];
  teamName: string;
  onCancel: () => void;
  onSave: (report: GameReport) => void;
  onLineup: (ids: string[]) => void;
}) {
  const existing = event.report;
  const [teamScore, setTeamScore] = useState(existing ? String(existing.teamScore) : "");
  const [opponentScore, setOpponentScore] = useState(existing ? String(existing.opponentScore) : "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const lineupKey = (event.lineup ?? []).join("|");
  const [lines, setLines] = useState<StatLine[]>(() => linesForLineup(event, players));
  useEffect(() => {
    setLines((current) => (event.lineup ?? []).flatMap((id) => {
      const player = players.find((item) => item.id === id);
      if (!player) return [];
      const kept = current.find((line) => line.playerId === id);
      if (kept) return [{ ...kept, name: player.name, number: player.number }];
      const saved = (event.report?.stats ?? []).find((line) => line.playerId === id);
      return [saved ? { ...saved, name: player.name, number: player.number } : blankLine(player)];
    }));
  }, [lineupKey]);
  const [error, setError] = useState("");
  const playerPoints = lines.filter((line) => line.played).reduce((total, line) => total + points(line), 0);

  function update(id: string, change: Partial<StatLine>) {
    setLines((current) => current.map((line) => line.playerId === id ? { ...line, ...change } : line));
  }

  function submit(formEvent: FormEvent) {
    formEvent.preventDefault();
    if (!/^\d{1,3}$/.test(teamScore) || !/^\d{1,3}$/.test(opponentScore)) {
      setError("Enter both final scores as whole numbers.");
      return;
    }
    const bad = lines.find((line) => line.played && (line.fgm > line.fga || line.tpm > line.tpa || line.ftm > line.fta || line.tpm > line.fgm || line.tpa > line.fga));
    if (bad) {
      setError(`Check ${bad.name}: makes can’t exceed attempts, and threes count inside field goals.`);
      return;
    }
    if (playerPoints > Number(teamScore)) {
      setError(`Player points add up to ${playerPoints}, more than the final score of ${teamScore}. Check the box score.`);
      return;
    }
    onSave({ teamScore: Number(teamScore), opponentScore: Number(opponentScore), notes: notes.trim(), stats: lines });
  }

  return (
    <form onSubmit={submit} className="report-form">
      <p className="field-hint">{formatDate(event.date).label} · {formatTime(event.time)} · {event.location}</p>
      <LineupPicker players={players} lineup={event.lineup ?? []} onChange={onLineup} />
      <div className="score-entry">
        <label>{teamName}<input inputMode="numeric" value={teamScore} onChange={(e) => setTeamScore(e.target.value.replace(/\D/g, "").slice(0, 3))} placeholder="0" /></label>
        <span>–</span>
        <label>{opponentName(event.title)}<input inputMode="numeric" value={opponentScore} onChange={(e) => setOpponentScore(e.target.value.replace(/\D/g, "").slice(0, 3))} placeholder="0" /></label>
      </div>

      <div className="report-section-head">
        <h4>Player statistics</h4>
        {lines.length > 0 && <span>Player points total {playerPoints}{teamScore && Number(teamScore) !== playerPoints ? ` · final score says ${teamScore}` : ""}</span>}
      </div>
      {lines.length === 0 ? (
        <p className="field-hint">Tick the players in this game above. Their stat lines show up here. You can still save the score and notes.</p>
      ) : (
        <div className="box-scroll">
          <table className="box-score is-entry">
            <thead>
              <tr>
                <th className="player-col">Player</th>
                <th>Played</th>
                {statColumns.map((column) => <th key={column.key}>{column.label}</th>)}
                <th>PTS</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.playerId} className={line.played ? "" : "is-dnp"}>
                  <td className="player-col"><span className="jersey">{line.number || "–"}</span>{line.name}</td>
                  <td><input type="checkbox" checked={line.played} onChange={(e) => update(line.playerId, { played: e.target.checked })} aria-label={`${line.name} played`} /></td>
                  {statColumns.map((column) => (
                    <td key={column.key}>
                      <input
                        inputMode="numeric"
                        aria-label={`${line.name} ${column.label}`}
                        disabled={!line.played}
                        value={line[column.key] || ""}
                        placeholder="0"
                        onChange={(e) => update(line.playerId, { [column.key]: Number(e.target.value.replace(/\D/g, "").slice(0, 3)) || 0 })}
                      />
                    </td>
                  ))}
                  <td className="pts-col">{line.played ? points(line) : "DNP"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="field-hint">Points are worked out from field goals, threes, and free throws.</p>

      <label>Post-game notes
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What went well, what to fix at the next practice, standout efforts." />
      </label>
      {error && <p className="field-error">{error}</p>}
      <div className="modal-actions">
        <button className="secondary-button" type="button" onClick={onCancel}>Cancel</button>
        <button className="primary-button" type="submit">Save report</button>
      </div>
    </form>
  );
}

function ReportView({ event, teamName, highlightId }: { event: ScheduleEvent; teamName: string; highlightId?: string }) {
  const report = event.report;
  if (!report) return null;
  const totals = teamTotals(report);
  const result = resultOf(report);
  const played = report.stats.filter((line) => line.played);
  const leader = (score: (line: StatLine) => number) => [...played].sort((a, b) => score(b) - score(a))[0];
  const leaders = played.length === 0 ? [] : [
    { label: "Points", line: leader(points), value: points(leader(points)) },
    { label: "Rebounds", line: leader((line) => line.reb), value: leader((line) => line.reb).reb },
    { label: "Assists", line: leader((line) => line.ast), value: leader((line) => line.ast).ast },
  ];

  return (
    <div className="report-view">
      <div className="scoreboard">
        <div className="score-team">
          <div className="large-badge raven">{initials(teamName)}</div>
          <span>{teamName}</span>
          <strong className={result === "W" ? "is-winner" : ""}>{report.teamScore}</strong>
        </div>
        <div className="score-middle">
          <span className={`result-pill result-${result}`}>{result === "W" ? "Win" : result === "L" ? "Loss" : "Tie"}</span>
          <small>Final</small>
          <small>{formatDate(event.date).label}</small>
          <small>{event.location}</small>
        </div>
        <div className="score-team">
          <div className="large-badge tiger">{initials(opponentName(event.title))}</div>
          <span>{opponentName(event.title)}</span>
          <strong className={result === "L" ? "is-winner" : ""}>{report.opponentScore}</strong>
        </div>
      </div>

      {played.length > 0 && (
        <>
          <div className="team-tiles">
            <div><span>FG</span><strong>{pct(totals.fgm, totals.fga)}</strong><small>{totals.fgm}/{totals.fga}</small></div>
            <div><span>3PT</span><strong>{pct(totals.tpm, totals.tpa)}</strong><small>{totals.tpm}/{totals.tpa}</small></div>
            <div><span>FT</span><strong>{pct(totals.ftm, totals.fta)}</strong><small>{totals.ftm}/{totals.fta}</small></div>
            <div><span>Rebounds</span><strong>{totals.reb}</strong><small>Team total</small></div>
            <div><span>Assists</span><strong>{totals.ast}</strong><small>Team total</small></div>
            <div><span>Turnovers</span><strong>{totals.tov}</strong><small>Team total</small></div>
          </div>

          <div className="leaders">
            {leaders.map((item) => (
              <div key={item.label}>
                <span className="eyebrow">{item.label} leader</span>
                <strong>{item.line.name}</strong>
                <small>{item.value} {item.label.toLowerCase()}</small>
              </div>
            ))}
          </div>

          <div className="report-section-head"><h4>Box score</h4></div>
          <div className="box-scroll">
            <table className="box-score">
              <thead>
                <tr>
                  <th className="player-col">Player</th>
                  <th>MIN</th><th>PTS</th><th>FG</th><th>3PT</th><th>FT</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>TO</th><th>PF</th>
                </tr>
              </thead>
              <tbody>
                {report.stats.map((line) => (
                  <tr key={line.playerId} className={`${line.played ? "" : "is-dnp"}${line.playerId === highlightId ? " is-me" : ""}`}>
                    <td className="player-col"><span className="jersey">{line.number || "–"}</span>{line.name}</td>
                    {line.played ? (
                      <>
                        <td>{line.min}</td>
                        <td className="pts-col">{points(line)}</td>
                        <td>{line.fgm}-{line.fga}</td>
                        <td>{line.tpm}-{line.tpa}</td>
                        <td>{line.ftm}-{line.fta}</td>
                        <td>{line.reb}</td><td>{line.ast}</td><td>{line.stl}</td><td>{line.blk}</td><td>{line.tov}</td><td>{line.pf}</td>
                      </>
                    ) : <td colSpan={11} className="dnp-cell">Did not play</td>}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="player-col">Team</td>
                  <td>—</td>
                  <td className="pts-col">{totals.pts}</td>
                  <td>{totals.fgm}-{totals.fga}</td>
                  <td>{totals.tpm}-{totals.tpa}</td>
                  <td>{totals.ftm}-{totals.fta}</td>
                  <td>{totals.reb}</td><td>{totals.ast}</td><td>{totals.stl}</td><td>{totals.blk}</td><td>{totals.tov}</td><td>{totals.pf}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      <div className="report-section-head"><h4>Coach’s notes</h4></div>
      <p className="detail-copy report-notes">{report.notes || "No post-game notes yet."}</p>
    </div>
  );
}

function readImageFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const max = 1200;
        const scale = Math.min(1, max / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Could not read that image."));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.onerror = () => reject(new Error("Could not read that image."));
      image.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error("Could not read that image."));
    reader.readAsDataURL(file);
  });
}

type Point = { x: number; y: number };
type CourtMark =
  | { type: "stroke"; points: Point[]; color: string }
  | { type: "player"; x: number; y: number; n: number };

function drawCourt(context: CanvasRenderingContext2D, width: number, height: number) {
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#c9956a";
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "rgba(83,51,28,0.08)";
  context.lineWidth = 2;
  for (let x = 0; x < width; x += 36) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }
  const margin = 22;
  context.strokeStyle = "rgba(255,255,255,0.92)";
  context.lineWidth = 3;
  context.strokeRect(margin, margin, width - margin * 2, height - margin * 2);
  const keyWidth = width * 0.26;
  const keyHeight = height * 0.38;
  const keyX = (width - keyWidth) / 2;
  context.strokeRect(keyX, margin, keyWidth, keyHeight);
  context.beginPath();
  context.arc(width / 2, margin + keyHeight, keyWidth * 0.38, 0, Math.PI);
  context.stroke();
  context.beginPath();
  context.arc(width / 2, margin + 36, 14, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.arc(width / 2, margin + 28, width * 0.34, 0.18 * Math.PI, 0.82 * Math.PI);
  context.stroke();
}

function paintCourt(context: CanvasRenderingContext2D, width: number, height: number, background: HTMLImageElement | null, marks: CourtMark[], live: Point[] | null, color: string) {
  drawCourt(context, width, height);
  if (background) context.drawImage(background, 0, 0, width, height);
  context.lineCap = "round";
  context.lineJoin = "round";
  for (const mark of marks) {
    if (mark.type === "stroke") {
      context.strokeStyle = mark.color;
      context.lineWidth = 5;
      context.beginPath();
      mark.points.forEach((point, index) => index === 0 ? context.moveTo(point.x, point.y) : context.lineTo(point.x, point.y));
      context.stroke();
    } else {
      context.beginPath();
      context.fillStyle = "#172019";
      context.arc(mark.x, mark.y, 18, 0, Math.PI * 2);
      context.fill();
      context.lineWidth = 3;
      context.strokeStyle = "#d9ff57";
      context.stroke();
      context.fillStyle = "#d9ff57";
      context.font = "700 16px sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(String(mark.n), mark.x, mark.y + 1);
    }
  }
  if (live && live.length > 0) {
    context.strokeStyle = color;
    context.lineWidth = 5;
    context.beginPath();
    live.forEach((point, index) => index === 0 ? context.moveTo(point.x, point.y) : context.lineTo(point.x, point.y));
    context.stroke();
  }
}

function CourtDrawer({ initial, onChange }: { initial: string; onChange: (value: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const background = useRef<HTMLImageElement | null>(null);
  const [ready, setReady] = useState(initial === "");
  const [tool, setTool] = useState<"pen" | "player" | "erase">("pen");
  const [color, setColor] = useState("#ffffff");
  const [marks, setMarks] = useState<CourtMark[]>([]);
  const [live, setLive] = useState<Point[] | null>(null);
  const liveRef = useRef<Point[] | null>(null);
  const playerCount = useRef(0);

  useEffect(() => {
    if (!initial) return;
    const image = new Image();
    image.onload = () => {
      background.current = image;
      setReady(true);
    };
    image.src = initial;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || !ready) return;
    paintCourt(context, canvas.width, canvas.height, background.current, marks, live, color);
    const hasDrawing = marks.length > 0 || Boolean(background.current);
    onChange(hasDrawing ? canvas.toDataURL("image/jpeg", 0.85) : "");
  }, [marks, live, ready, color, onChange]);

  function canvasPoint(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function pointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    const point = canvasPoint(event);
    if (tool === "erase") {
      setMarks((current) => current.filter((mark) => {
        if (mark.type === "player") return Math.hypot(mark.x - point.x, mark.y - point.y) > 24;
        return !mark.points.some((strokePoint) => Math.hypot(strokePoint.x - point.x, strokePoint.y - point.y) < 22);
      }));
      return;
    }
    if (tool === "player") {
      playerCount.current = playerCount.current % 5 + 1;
      setMarks((current) => [...current, { type: "player", ...point, n: playerCount.current }]);
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    liveRef.current = [point];
    setLive(liveRef.current);
  }

  function pointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!liveRef.current) return;
    liveRef.current = [...liveRef.current, canvasPoint(event)];
    setLive(liveRef.current);
  }

  function pointerUp() {
    const stroke = liveRef.current;
    if (!stroke || stroke.length === 0) return;
    liveRef.current = null;
    setLive(null);
    setMarks((current) => [...current, { type: "stroke", points: stroke, color }]);
  }

  return (
    <div className="court-drawer">
      <div className="sketch-tools">
        <button type="button" className={tool === "pen" ? "active" : ""} onClick={() => setTool("pen")}><Pencil size={14} /> Draw</button>
        <button type="button" className={color === "#ffffff" && tool === "pen" ? "active" : ""} onClick={() => { setTool("pen"); setColor("#ffffff"); }}>White</button>
        <button type="button" className={color === "#172019" && tool === "pen" ? "active" : ""} onClick={() => { setTool("pen"); setColor("#172019"); }}>Black</button>
        <button type="button" className={tool === "player" ? "active" : ""} onClick={() => setTool("player")}>Player</button>
        <button type="button" className={tool === "erase" ? "active" : ""} onClick={() => setTool("erase")}><Eraser size={14} /> Erase</button>
        <button type="button" onClick={() => setMarks((current) => current.slice(0, -1))}><Undo2 size={14} /> Undo</button>
        <button type="button" onClick={() => { background.current = null; setMarks([]); }}>Clear</button>
      </div>
      <canvas
        ref={canvasRef}
        width={960}
        height={540}
        className="sketch-canvas"
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerLeave={pointerUp}
      />
    </div>
  );
}

function PlayForm({ initial, onCancel, onSave }: { initial?: Play; onCancel: () => void; onSave: (play: Play) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState<PlayCategory>(initial?.category ?? "Offense");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [videoUrl, setVideoUrl] = useState(initial?.videoUrl ?? "");
  const [diagram, setDiagram] = useState(initial?.diagram ?? "");
  const [drawing, setDrawing] = useState(false);
  const [error, setError] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Give the play a name.");
      return;
    }
    if (videoUrl.trim() && !videoEmbed(videoUrl)) {
      setError("Use a YouTube, Vimeo, or .mp4 link.");
      return;
    }
    if (diagram.length > 1_500_000) {
      setError("That image is too large. Try a smaller photo.");
      return;
    }
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      name: name.trim(),
      category,
      notes: notes.trim(),
      videoUrl: videoUrl.trim(),
      diagram,
    });
  }

  async function uploadImage(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Upload an image file.");
      return;
    }
    try {
      setDiagram(await readImageFile(file));
      setDrawing(false);
      setError("");
    } catch {
      setError("Could not read that image.");
    }
  }

  return (
    <form onSubmit={submit}>
      <label>Play name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Horns Twist" /></label>
      <label>Category
        <select value={category} onChange={(event) => setCategory(event.target.value as PlayCategory)}>
          {playFilters.slice(1).map((option) => <option key={option}>{option}</option>)}
        </select>
      </label>
      <label>Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="When to run it, and what to look for." /></label>
      <label>Video link<input value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="https://www.youtube.com/watch?v=..." /></label>
      <p className="field-hint">Paste a YouTube, Vimeo, or video file link. The card uses that video’s thumbnail.</p>
      <div className="visual-block">
        <span>Diagram</span>
        <div className="visual-choices">
          <button type="button" onClick={() => fileRef.current?.click()}><ImagePlus size={15} /> Upload image</button>
          <button type="button" className={drawing ? "active" : ""} onClick={() => setDrawing(true)}><Pencil size={15} /> Draw the play</button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(event) => { void uploadImage(event.target.files?.[0]); event.target.value = ""; }} />
        {diagram && !drawing && <img className="diagram-preview" src={diagram} alt="Play diagram" />}
        {drawing && <CourtDrawer initial={diagram} onChange={setDiagram} />}
        {(diagram || drawing) && (
          <button type="button" className="text-button remove-diagram" onClick={() => { setDiagram(""); setDrawing(false); }}>Remove diagram</button>
        )}
      </div>
      {error && <p className="field-error">{error}</p>}
      <div className="modal-actions">
        <button className="secondary-button" type="button" onClick={onCancel}>Cancel</button>
        <button className="primary-button" type="submit">Save play</button>
      </div>
    </form>
  );
}

function PlayerForm({ initial, onCancel, onSave }: { initial?: Player; onCancel: () => void; onSave: (player: Player) => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [number, setNumber] = useState(initial?.number ?? "");
  const [position, setPosition] = useState<Position>(initial?.position ?? "PG");
  const [status, setStatus] = useState<PlayerStatus>(initial?.status ?? "Ready");
  const [error, setError] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !number.trim()) {
      setError("Enter the player’s name and number.");
      return;
    }
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      name: name.trim(),
      number: number.trim(),
      position,
      status,
      rating: initial?.rating ?? "",
      review: initial?.review ?? "",
      accountEmail: initial?.accountEmail,
    });
  }

  return (
    <form onSubmit={submit}>
      {initial?.accountEmail && <p className="field-hint">This player joined with their own account, so their name, number, and position come from that account.</p>}
      <label>Name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Marcus Lee" readOnly={Boolean(initial?.accountEmail)} /></label>
      <div className="field-row">
        <label>Number<input value={number} onChange={(event) => setNumber(digits(event.target.value, 2))} inputMode="numeric" placeholder="4" readOnly={Boolean(initial?.accountEmail)} /></label>
        <label>Position
          <select value={position} disabled={Boolean(initial?.accountEmail)} onChange={(event) => setPosition(event.target.value as Position)}>
            {(["PG", "SG", "SF", "PF", "C"] as Position[]).map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
      </div>
      <label>Status
        <select value={status} onChange={(event) => setStatus(event.target.value as PlayerStatus)}>
          {(["Ready", "Limited", "Out"] as PlayerStatus[]).map((option) => <option key={option}>{option}</option>)}
        </select>
      </label>
      {error && <p className="field-error">{error}</p>}
      <div className="modal-actions">
        <button className="secondary-button" type="button" onClick={onCancel}>Cancel</button>
        <button className="primary-button" type="submit">Save player</button>
      </div>
    </form>
  );
}

function EmptyState({ title, detail, action, onAction }: { title: string; detail: string; action?: string; onAction?: () => void }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>{detail}</p>
      {action && onAction && <button className="primary-button" onClick={onAction}><Plus size={16} /> {action}</button>}
    </div>
  );
}

const eventTypes: EventType[] = ["Game", "Practice", "Film", "Meeting"];

function SchedulePage({
  events,
  players,
  onAdd,
  onOpen,
  onResults,
}: {
  events: ScheduleEvent[];
  players: Player[];
  onAdd: () => void;
  onOpen: (id: string) => void;
  onResults: () => void;
}) {
  const [filter, setFilter] = useState<EventType | "All">("All");
  const [showPast, setShowPast] = useState(false);
  const upcoming = events.filter(isUpcoming).sort(bySchedule);
  const visible = upcoming.filter((event) => filter === "All" || event.type === filter);
  const pastOther = events.filter((event) => !isUpcoming(event) && !isResult(event)).sort(byRecent);
  const resultsDue = events.filter((event) => canReport(event) && !event.report).length;

  const groups = visible.reduce<{ label: string; items: ScheduleEvent[] }[]>((list, event) => {
    const label = new Date(`${event.date}T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const last = list[list.length - 1];
    if (last?.label === label) last.items.push(event);
    else list.push({ label, items: [event] });
    return list;
  }, []);

  function row(event: ScheduleEvent, past = false) {
    const when = formatDate(event.date);
    const away = daysUntil(event.date);
    const lineup = event.lineup ?? [];
    return (
      <article className={`event-row ${past ? "is-past" : ""}`} key={event.id}>
        <div className="event-date"><span>{when.day}</span><strong>{when.date}</strong></div>
        <div className={`event-stripe ${eventAccent[event.type]}`} />
        <div className="event-info">
          <span className="tag">{event.type}{!past && away === 0 ? " · Today" : !past && away === 1 ? " · Tomorrow" : ""}</span>
          <h3>{event.title}</h3>
          <p><Clock3 size={14} /> {formatTime(event.time)} · {event.location}</p>
          {event.notes ? <p className="event-notes">{event.notes}</p> : null}
        </div>
        {event.type === "Game" && !past ? (
          <button className={`report-chip ${lineup.length ? "is-set" : ""}`} onClick={() => onOpen(event.id)}>
            <Users size={15} /> {lineup.length === 0 ? "Pick lineup" : `${lineup.length} playing`}
          </button>
        ) : (
          <div className="attendance">
            <span>Roster</span>
            {players.length === 0 ? <small>No players yet</small> : (
              <div className="avatar-stack">
                {players.slice(0, 3).map((player) => <i key={player.id}>{initials(player.name)}</i>)}
                {players.length > 3 && <i>+{players.length - 3}</i>}
              </div>
            )}
          </div>
        )}
        <button className="icon-button" aria-label={`Open ${event.title}`} onClick={() => onOpen(event.id)}><ChevronRight size={19} /></button>
      </article>
    );
  }

  return (
    <section className="page-stack">
      <div className="section-intro">
        <div>
          <p className="eyebrow">{upcoming.length === 0 ? "Nothing scheduled" : `${upcoming.length} upcoming event${upcoming.length === 1 ? "" : "s"}`}</p>
          <h2>Upcoming schedule</h2>
          <p>Games, practices, and team events. Once a game tips off it moves to Results.</p>
        </div>
        <button className="primary-button" onClick={onAdd}><Plus size={17} /> Add event</button>
      </div>
      {resultsDue > 0 && (
        <button className="inline-alert" onClick={onResults}>
          <Trophy size={17} />
          <span><strong>{resultsDue} game{resultsDue === 1 ? "" : "s"} waiting for a result.</strong> Enter the score and stats on the Results page.</span>
          <ChevronRight size={16} />
        </button>
      )}
      {upcoming.length > 0 && (
        <div className="filter-row">
          {(["All", ...eventTypes] as const).map((option) => {
            const count = option === "All" ? upcoming.length : upcoming.filter((event) => event.type === option).length;
            return <button key={option} className={`filter ${filter === option ? "active" : ""}`} onClick={() => setFilter(option)}>{option === "All" ? "All events" : `${option}s`} <small>{count}</small></button>;
          })}
        </div>
      )}
      {upcoming.length === 0 ? (
        <EmptyState
          title="No upcoming events"
          detail="Add a game, practice, film session, or meeting and it will show up here."
          action="Add event"
          onAction={onAdd}
        />
      ) : visible.length === 0 ? (
        <p className="table-empty">No {filter.toLowerCase()}s coming up.</p>
      ) : (
        groups.map((group) => (
          <div className="schedule-group" key={group.label}>
            <p className="group-label">{group.label}</p>
            <div className="schedule-list">{group.items.map((event) => row(event))}</div>
          </div>
        ))
      )}
      {pastOther.length > 0 && (
        <div className="schedule-group">
          <button className="text-button past-toggle" onClick={() => setShowPast((value) => !value)}>
            {showPast ? "Hide" : "Show"} past practices and sessions ({pastOther.length}) <ChevronRight size={15} className={showPast ? "is-open" : ""} />
          </button>
          {showPast && <div className="schedule-list">{pastOther.map((event) => row(event, true))}</div>}
        </div>
      )}
    </section>
  );
}

function ResultsPage({
  events,
  onOpen,
  onReport,
  teamName,
}: {
  events: ScheduleEvent[];
  onOpen: (id: string) => void;
  onReport: (id: string) => void;
  teamName: string;
}) {
  const games = events.filter(isResult).sort(byRecent);
  const due = games.filter((event) => !event.report);
  const reported = games.filter((event) => event.report);
  const record = seasonRecord(events);
  const leaders = seasonLeaders(reported);

  function row(event: ScheduleEvent) {
    const when = formatDate(event.date);
    const report = event.report;
    return (
      <article className="event-row" key={event.id}>
        <div className="event-date"><span>{when.day}</span><strong>{when.date}</strong></div>
        <div className={`event-stripe ${report ? `result-stripe-${resultOf(report)}` : "orange"}`} />
        <div className="event-info">
          <span className="tag">{report ? "Final" : "Needs result"}</span>
          <h3>{event.title}</h3>
          <p><Clock3 size={14} /> {when.label} · {formatTime(event.time)} · {event.location}</p>
          {report?.notes ? <p className="event-notes">{report.notes}</p> : null}
        </div>
        {report ? (
          <button className="score-chip" onClick={() => onOpen(event.id)}>
            <span className={`result-pill result-${resultOf(report)}`}>{resultOf(report)}</span>
            <strong>{report.teamScore}–{report.opponentScore}</strong>
          </button>
        ) : (
          <button className="report-chip" onClick={() => onReport(event.id)}><BarChart3 size={15} /> Enter result</button>
        )}
        <button className="icon-button" aria-label={report ? `Open ${event.title} report` : `Enter result for ${event.title}`} onClick={() => report ? onOpen(event.id) : onReport(event.id)}><ChevronRight size={19} /></button>
      </article>
    );
  }

  return (
    <section className="page-stack">
      <div className="section-intro">
        <div>
          <p className="eyebrow">{teamName}</p>
          <h2>Results</h2>
          <p>Final scores, box scores, and post-game notes for every game that has been played.</p>
        </div>
      </div>
      <div className="summary-grid">
        <div><span>Record</span><strong>{record.games ? record.label : "0–0"}</strong><small>{record.games} game{record.games === 1 ? "" : "s"} reported</small></div>
        <div><span>Points for</span><strong>{record.ppg}</strong><small>per game</small></div>
        <div><span>Points against</span><strong>{record.oppg}</strong><small>per game</small></div>
        <div><span>Avg margin</span><strong>{record.games && Number(record.margin) > 0 ? `+${record.margin}` : record.margin}</strong><small>per game</small></div>
      </div>
      {games.length === 0 ? (
        <div className="empty-state">
          <h3>No games played yet</h3>
          <p>When a game on your schedule tips off, it appears here so you can enter the score and stats.</p>
        </div>
      ) : (
        <div className="results-layout">
          <div className="page-stack">
            {due.length > 0 && (
              <div className="schedule-group">
                <p className="group-label">Waiting for a result</p>
                <div className="schedule-list">{due.map(row)}</div>
              </div>
            )}
            {reported.length > 0 && (
              <div className="schedule-group">
                <p className="group-label">Completed</p>
                <div className="schedule-list">{reported.map(row)}</div>
              </div>
            )}
          </div>
          <aside className="panel leaders-panel">
            <p className="eyebrow">Season leaders</p>
            <h3>Per game</h3>
            {leaders.length === 0 ? (
              <p className="detail-copy">Leaders show up once a box score is saved.</p>
            ) : leaders.map((item) => (
              <div className="leader-row" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.name}</strong>
                <em>{item.value}</em>
              </div>
            ))}
          </aside>
        </div>
      )}
    </section>
  );
}

function seasonLeaders(reported: ScheduleEvent[]) {
  const totals = new Map<string, { name: string; games: number; pts: number; reb: number; ast: number; stl: number }>();
  for (const event of reported) {
    for (const line of event.report?.stats ?? []) {
      if (!line.played) continue;
      const current = totals.get(line.playerId) ?? { name: line.name, games: 0, pts: 0, reb: 0, ast: 0, stl: 0 };
      current.name = line.name;
      current.games += 1;
      current.pts += points(line);
      current.reb += line.reb;
      current.ast += line.ast;
      current.stl += line.stl;
      totals.set(line.playerId, current);
    }
  }
  const list = [...totals.values()];
  if (list.length === 0) return [];
  const best = (key: "pts" | "reb" | "ast" | "stl") => {
    const top = [...list].sort((a, b) => b[key] / b.games - a[key] / a.games)[0];
    return { name: top.name, value: (top[key] / top.games).toFixed(1) };
  };
  return [
    { label: "Points", ...best("pts") },
    { label: "Rebounds", ...best("reb") },
    { label: "Assists", ...best("ast") },
    { label: "Steals", ...best("stl") },
  ];
}

function PlaybookPage({
  plays,
  onAdd,
  onOpen,
}: {
  plays: Play[];
  onAdd: () => void;
  onOpen: (id: string) => void;
}) {
  const [filter, setFilter] = useState<(typeof playFilters)[number]>("All plays");
  const visible = plays.filter((play) => filter === "All plays" || play.category === filter);

  return (
    <section className="page-stack">
      <div className="section-intro">
        <div>
          <p className="eyebrow">{plays.length === 0 ? "Empty playbook" : `${plays.length} saved play${plays.length === 1 ? "" : "s"}`}</p>
          <h2>Your playbook</h2>
          <p>Build, organize, and share your team’s system.</p>
        </div>
        <button className="primary-button" onClick={onAdd}><Plus size={17} /> New play</button>
      </div>
      <div className="filter-row">
        {playFilters.map((option) => (
          <button key={option} className={`filter ${filter === option ? "active" : ""}`} onClick={() => setFilter(option)}>{option}</button>
        ))}
      </div>
      {visible.length === 0 ? (
        <EmptyState
          title={plays.length === 0 ? "No plays yet" : "Nothing in this view"}
          detail={plays.length === 0 ? "Add a play and it will appear in the book." : "This category is empty."}
          action="New play"
          onAction={onAdd}
        />
      ) : (
        <div className="playbook-grid">
          {visible.map((play, index) => (
            <article className="play-card" key={play.id}>
              <button className={`diagram thumb-play variant-${index % 4} ${play.videoUrl ? "has-video" : ""}`} onClick={() => onOpen(play.id)} aria-label={play.videoUrl ? `Play ${play.name}` : `Open ${play.name}`}>
                <PlayArt play={play} />
                {play.videoUrl && <span><Play size={16} fill="currentColor" /></span>}
              </button>
              <button className="play-card-copy" onClick={() => onOpen(play.id)}>
                <span className="tag">{play.category}</span>
                <h3>{play.name}</h3>
                <p>{play.videoUrl ? "Video ready to play" : play.diagram ? "Diagram saved" : play.notes || "No notes yet"}</p>
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function SettingsPanel({
  profile,
  teamCode,
  theme,
  onTheme,
  onSaveTeam,
  onClose,
}: {
  profile: CoachProfile;
  teamCode: string;
  theme: Theme;
  onTheme: (theme: Theme) => void;
  onSaveTeam: (details: { teamName: string; season: string }) => void;
  onClose: () => void;
}) {
  const [teamName, setTeamName] = useState(profile.teamName);
  const [season, setSeason] = useState(profile.season);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function saveDetails(event: FormEvent) {
    event.preventDefault();
    if (!teamName.trim()) {
      setError("Enter the team name.");
      setSaved(false);
      return;
    }
    if (!/^\d{4}$/.test(season)) {
      setError("Enter the season as a four-digit year.");
      setSaved(false);
      return;
    }
    onSaveTeam({ teamName: teamName.trim(), season });
    setError("");
    setSaved(true);
  }

  return (
    <div className="settings">
      <section>
        <p className="eyebrow">Account</p>
        <div className="settings-profile">
          <div className="avatar">{initials(profile.name)}</div>
          <div>
            <strong>{profile.name}</strong>
            <span>Head coach · {profile.teamName} · {profile.season}</span>
          </div>
        </div>
      </section>
      <section>
        <p className="eyebrow">Team details</p>
        <p className="field-hint">Fix a spelling mistake here. The team code stays the same, so players who already joined stay on the roster.</p>
        <form onSubmit={saveDetails}>
          <label>Team name<input value={teamName} onChange={(event) => { setTeamName(event.target.value); setSaved(false); }} placeholder="Northside Ravens" /></label>
          <label>Season<input inputMode="numeric" value={season} onChange={(event) => { setSeason(digits(event.target.value, 4)); setSaved(false); }} placeholder="2026" /></label>
          {error && <p className="field-error">{error}</p>}
          <div className="modal-actions">
            <button className="secondary-button" type="submit">{saved ? "Saved" : "Save team details"}</button>
          </div>
        </form>
      </section>
      <section>
        <p className="eyebrow">Team colour</p>
        <p className="field-hint">Changes the accent and sidebar colour for you and your players.</p>
        <div className="swatches">
          {themes.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`swatch ${theme.id === option.id ? "active" : ""}`}
              onClick={() => onTheme(option)}
              aria-pressed={theme.id === option.id}
            >
              <span style={{ background: option.dark }}><i style={{ background: option.accent }} /></span>
              {option.name}
            </button>
          ))}
          <label className={`swatch ${theme.id === "custom" ? "active" : ""}`}>
            <span style={{ background: theme.id === "custom" ? theme.dark : "#1b1d1b" }}>
              <i style={{ background: theme.id === "custom" ? theme.accent : "conic-gradient(#ff6b6b, #ffc94a, #d9ff57, #4fe3c1, #7cc4ff, #c3a1ff, #ff6b6b)" }} />
            </span>
            Custom
            <input type="color" value={theme.accent} onChange={(event) => onTheme(customTheme(event.target.value))} aria-label="Pick a custom colour" />
          </label>
        </div>
        <div className="theme-preview">
          <span className="primary-button">Primary button</span>
          <span className="result-pill result-W">W</span>
          <span className="jersey">23</span>
          <span className="theme-chip">Active</span>
        </div>
      </section>
      <section>
        <p className="eyebrow">Players</p>
        <TeamCodeCard code={teamCode} />
      </section>
      <p className="field-hint">Your schedule, playbook, roster, results, and scouting are saved in this browser.</p>
      <div className="modal-actions">
        <button className="primary-button" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}

function TeamCodeCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="team-code">
      <div>
        <span className="eyebrow">Team code</span>
        <strong>{code}</strong>
        <p>Give this to your players. When they create an account with it, they appear on this roster.</p>
      </div>
      <button
        type="button"
        className="secondary-button"
        onClick={() => {
          void navigator.clipboard?.writeText(code).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          });
        }}
      >{copied ? "Copied" : "Copy code"}</button>
    </div>
  );
}

function RosterPage({
  players,
  teamCode,
  onAdd,
  onOpen,
  onReview,
}: {
  players: Player[];
  teamCode: string;
  onAdd: () => void;
  onOpen: (id: string) => void;
  onReview: () => void;
}) {
  const reviewed = players.filter((player) => player.review);

  return (
    <section className="page-stack">
      <div className="section-intro">
        <div>
          <p className="eyebrow">{players.length === 0 ? "No players yet" : `${players.length} active player${players.length === 1 ? "" : "s"}`}</p>
          <h2>Team roster</h2>
          <p>Players with an account appear here on their own. You can still add someone who hasn’t signed up.</p>
        </div>
        <button className="primary-button" onClick={onAdd}><Plus size={17} /> Add player</button>
      </div>
      <TeamCodeCard code={teamCode} />
      {players.length === 0 ? (
        <EmptyState title="Your roster is empty" detail="Share the team code. When a player creates an account with it, they show up here." action="Add player" onAction={onAdd} />
      ) : (
        <div className="roster-layout">
          <div className="panel roster-table">
            <div className="table-head"><span>Player</span><span>Position</span><span>Status</span><span>Last rating</span><span /></div>
            {players.map((player) => (
              <div className="player-row" key={player.id}>
                <div className="player-name"><div className="avatar player-avatar">{initials(player.name)}</div><div><strong>{player.name}</strong><span>#{player.number}{player.accountEmail ? " · Account" : ""}</span></div></div>
                <strong>{player.position}</strong>
                <span className={`status ${player.status.toLowerCase()}`}>{player.status}</span>
                <div className="rating"><strong>{player.rating || "—"}</strong>{player.rating && <span>/ 10</span>}</div>
                <button className="icon-button" aria-label={`Open ${player.name}`} onClick={() => onOpen(player.id)}><ChevronRight size={18} /></button>
              </div>
            ))}
          </div>
          <aside className="panel review-card">
            <div className="stat-icon blue"><ClipboardList size={21} /></div>
            <p className="eyebrow">Game reviews</p>
            <h3>{reviewed.length === 0 ? "No reviews yet" : `${reviewed.length} written`}</h3>
            <p>{players.length === reviewed.length ? "Everyone has feedback." : "Write a short note for each player after the game."}</p>
            <div className="review-avatars">{players.slice(0, 4).map((player) => <span key={player.id}>{initials(player.name)}</span>)}</div>
            <button className="primary-button" onClick={onReview}>Start reviews <ChevronRight size={16} /></button>
          </aside>
        </div>
      )}
    </section>
  );
}

function ScoutForm({ initial, opponent, onCancel, onSave }: { initial?: ScoutReport; opponent?: string; onCancel: () => void; onSave: (report: ScoutReport) => void }) {
  const [name, setName] = useState(initial?.opponent ?? opponent ?? "");
  const [record, setRecord] = useState(initial?.record ?? "");
  const [offense, setOffense] = useState(initial?.offense ?? "");
  const [defense, setDefense] = useState(initial?.defense ?? "");
  const [keyPlayers, setKeyPlayers] = useState<ScoutPlayer[]>(initial?.keyPlayers.length ? initial.keyPlayers : [{ number: "", name: "", note: "" }]);
  const [keys, setKeys] = useState<string[]>(initial?.keys.length ? [...initial.keys, "", "", ""].slice(0, 3) : ["", "", ""]);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState("");

  function updatePlayer(index: number, change: Partial<ScoutPlayer>) {
    setKeyPlayers((current) => current.map((player, i) => i === index ? { ...player, ...change } : player));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Enter the opponent’s name.");
      return;
    }
    if (record && !/^\d{1,3}\s*[–-]\s*\d{1,3}$/.test(record.trim())) {
      setError("Enter their record like 10–6.");
      return;
    }
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      opponent: opponentName(name.trim()),
      record: record.trim().replace("-", "–"),
      offense: offense.trim(),
      defense: defense.trim(),
      keyPlayers: keyPlayers.filter((player) => player.name.trim()).map((player) => ({ number: player.number.trim(), name: player.name.trim(), note: player.note.trim() })),
      keys: keys.map((key) => key.trim()).filter(Boolean),
      notes: notes.trim(),
      updated: todayISO(),
    });
  }

  return (
    <form onSubmit={submit}>
      <div className="field-row">
        <label>Opponent<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Eastview Tigers" /></label>
        <label>Their record<input value={record} onChange={(e) => setRecord(e.target.value.replace(/[^\d–-]/g, "").slice(0, 7))} placeholder="10–6" inputMode="numeric" /></label>
      </div>
      <label>On offense<textarea value={offense} onChange={(e) => setOffense(e.target.value)} placeholder="Pace, favourite sets, who takes the big shots." /></label>
      <label>On defense<textarea value={defense} onChange={(e) => setDefense(e.target.value)} placeholder="Man or zone, press, how they guard ball screens." /></label>

      <div className="report-section-head"><h4>Key players</h4></div>
      <div className="scout-players">
        {keyPlayers.map((player, index) => (
          <div className="scout-player-row" key={index}>
            <input aria-label="Number" value={player.number} onChange={(e) => updatePlayer(index, { number: digits(e.target.value, 2) })} placeholder="#" inputMode="numeric" />
            <input aria-label="Name" value={player.name} onChange={(e) => updatePlayer(index, { name: e.target.value })} placeholder="Player name" />
            <input aria-label="Scouting note" value={player.note} onChange={(e) => updatePlayer(index, { note: e.target.value })} placeholder="Left-hand driver, shoots off screens" />
            <button type="button" className="icon-button" aria-label="Remove player" onClick={() => setKeyPlayers((current) => current.length === 1 ? [{ number: "", name: "", note: "" }] : current.filter((_, i) => i !== index))}><X size={15} /></button>
          </div>
        ))}
      </div>
      {keyPlayers.length < 8 && <button type="button" className="text-button add-row" onClick={() => setKeyPlayers((current) => [...current, { number: "", name: "", note: "" }])}><Plus size={14} /> Add player</button>}

      <div className="report-section-head"><h4>Keys to win</h4></div>
      {keys.map((key, index) => (
        <label key={index} className="key-input">
          <span>{String(index + 1).padStart(2, "0")}</span>
          <input value={key} onChange={(e) => setKeys((current) => current.map((item, i) => i === index ? e.target.value : item))} placeholder={["Control the glass", "Make them play in the half court", "Protect the corners"][index]} />
        </label>
      ))}
      <label>Other notes<textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything else the staff should know." /></label>
      {error && <p className="field-error">{error}</p>}
      <div className="modal-actions">
        <button className="secondary-button" type="button" onClick={onCancel}>Cancel</button>
        <button className="primary-button" type="submit">Save report</button>
      </div>
    </form>
  );
}

function ScoutingPage({
  reports,
  events,
  onNew,
  onEdit,
  onDelete,
}: {
  reports: ScoutReport[];
  events: ScheduleEvent[];
  onNew: (opponent?: string) => void;
  onEdit: (report: ScoutReport) => void;
  onDelete: (id: string) => void;
}) {
  const upcomingGames = events.filter((event) => event.type === "Game" && isUpcoming(event)).sort(bySchedule);
  const gameFor = (report: ScoutReport) => upcomingGames.find((event) => sameOpponent(report.opponent, event.title));
  const sorted = [...reports].sort((a, b) => {
    const ga = gameFor(a);
    const gb = gameFor(b);
    if (ga && gb) return bySchedule(ga, gb);
    if (ga || gb) return ga ? -1 : 1;
    return b.updated.localeCompare(a.updated);
  });
  const [selectedId, setSelectedId] = useState(sorted[0]?.id ?? "");
  const selected = sorted.find((report) => report.id === selectedId) ?? sorted[0];
  const unscouted = upcomingGames.filter((event) => !reports.some((report) => sameOpponent(report.opponent, event.title)));
  const history = selected ? events.filter((event) => event.report && sameOpponent(event.title, selected.opponent)).sort(byRecent) : [];
  const game = selected ? gameFor(selected) : undefined;

  return (
    <section className="page-stack">
      <div className="section-intro no-print">
        <div>
          <p className="eyebrow">{reports.length === 0 ? "No reports yet" : `${reports.length} report${reports.length === 1 ? "" : "s"}`}</p>
          <h2>Scouting</h2>
          <p>Opponent tendencies, key players, and your game plan, ready to share with staff.</p>
        </div>
        <button className="primary-button" onClick={() => onNew()}><Plus size={17} /> New report</button>
      </div>

      {unscouted.length > 0 && (
        <div className="inline-alert is-static no-print">
          <Target size={17} />
          <span><strong>Not scouted yet:</strong> {unscouted.slice(0, 3).map((event) => opponentName(event.title)).join(", ")}{unscouted.length > 3 ? ` and ${unscouted.length - 3} more` : ""}</span>
          <button className="secondary-button" onClick={() => onNew(opponentName(unscouted[0].title))}>Scout {opponentName(unscouted[0].title)}</button>
        </div>
      )}

      {!selected ? (
        <div className="empty-state">
          <h3>No scouting reports</h3>
          <p>Write up an opponent before you play them: how they play, who to stop, and your keys to win.</p>
          <button className="primary-button" onClick={() => onNew(unscouted[0] ? opponentName(unscouted[0].title) : undefined)}><Plus size={16} /> New report</button>
        </div>
      ) : (
        <>
          {sorted.length > 1 && (
            <div className="filter-row no-print">
              {sorted.map((report) => (
                <button key={report.id} className={`filter ${report.id === selected.id ? "active" : ""}`} onClick={() => setSelectedId(report.id)}>{report.opponent}</button>
              ))}
            </div>
          )}
          <div className="print-area">
            <div className="scout-hero">
              <div className="large-badge tiger">{initials(selected.opponent)}</div>
              <div>
                <span className="tag">{game ? `Next meeting · ${formatDate(game.date).label} · ${formatTime(game.time)}` : "Scouting report"}</span>
                <h3>{selected.opponent}</h3>
                <p>{selected.record ? `${selected.record} overall` : "Record not entered"} · Updated {formatDate(selected.updated).label}</p>
              </div>
              <div className="scout-record">
                <span>Your results vs. them</span>
                <div>
                  {history.length === 0 ? <em>No games yet</em> : history.slice(0, 5).map((event) => event.report && (
                    <i key={event.id} className={resultOf(event.report) === "W" ? "w" : "l"} title={`${event.report.teamScore}–${event.report.opponentScore}`}>{resultOf(event.report)}</i>
                  ))}
                </div>
              </div>
            </div>
            <div className="scout-grid">
              <article className="panel">
                <div className="panel-heading"><div><p className="eyebrow">Team profile</p><h3>How they play</h3></div><Sparkles size={19} /></div>
                <div className="scout-section"><strong>On offense</strong><p>{selected.offense || "Not written yet."}</p></div>
                <div className="scout-section"><strong>On defense</strong><p>{selected.defense || "Not written yet."}</p></div>
                {selected.notes && <div className="scout-section"><strong>Other notes</strong><p>{selected.notes}</p></div>}
              </article>
              <article className="panel keys-card">
                <p className="eyebrow">Game plan</p><h3>Keys to win</h3>
                {selected.keys.length === 0 ? <p className="detail-copy">No keys written yet.</p> : selected.keys.map((key, index) => (
                  <div key={index}><span>{String(index + 1).padStart(2, "0")}</span><p><strong>{key}</strong></p></div>
                ))}
              </article>
            </div>
            <article className="panel">
              <div className="panel-heading"><div><p className="eyebrow">Personnel</p><h3>Key players</h3></div></div>
              {selected.keyPlayers.length === 0 ? <p className="detail-copy">No players listed.</p> : (
                <div className="scout-roster">
                  {selected.keyPlayers.map((player, index) => (
                    <div key={index}>
                      <span className="jersey">{player.number || "–"}</span>
                      <div><strong>{player.name}</strong><p>{player.note || "No notes."}</p></div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </div>
          <div className="modal-actions no-print">
            <button className="danger-button" onClick={() => onDelete(selected.id)}><Trash2 size={15} /> Delete</button>
            <button className="secondary-button" onClick={() => onEdit(selected)}><Pencil size={15} /> Edit</button>
            <button className="primary-button" onClick={() => window.print()}><Printer size={15} /> Print or save PDF</button>
          </div>
        </>
      )}
    </section>
  );
}

type Screen = "home" | "coach-login" | "coach-register" | "coach" | "player-login" | "player-register" | "player";

function HomeScreen({ onCoach, onPlayer }: { onCoach: () => void; onPlayer: () => void }) {
  return (
    <div className="gate gate-home">
      <div className="gate-stage">
        <Logo />
        <p className="eyebrow light">For coaches and players</p>
        <h2>Your season, in one place.</h2>
        <p>Playbooks, game reviews, the schedule, and scouting reports for the people who run the team.</p>
        <section className="role-grid">
          <button className="role-card" onClick={onCoach}>
            <span className="role-icon"><Users size={22} /></span>
            <strong>I’m a coach</strong>
            <span>Open the team workspace: playbook, roster, schedule, and scouting.</span>
            <em>Continue <ChevronRight size={15} /></em>
          </button>
          <button className="role-card" onClick={onPlayer}>
            <span className="role-icon"><UserRound size={22} /></span>
            <strong>I’m a player</strong>
            <span>Join your team with the code from your coach, then see the schedule and game notes.</span>
            <em>Sign in <ChevronRight size={15} /></em>
          </button>
        </section>
      </div>
    </div>
  );
}

function CoachLogin({
  onBack,
  onRegister,
  onDemo,
  onEnter,
}: {
  onBack: () => void;
  onRegister: () => void;
  onDemo: () => void;
  onEnter: (email: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (loadPlayerAccounts().some((item) => item.email === normalized)) {
      setError("That email is a player account. Sign in from I’m a player.");
      return;
    }
    const account = loadAccounts().find((item) => item.email === normalized);
    if (!account) {
      setError("No coach account uses that email. Create one to continue.");
      return;
    }
    if (account.passwordHash !== await hashPassword(password)) {
      setError("That password doesn’t match this account.");
      return;
    }
    onEnter(account.email);
  }

  return (
    <div className="gate login-gate">
      <button className="back-link" onClick={onBack}><ArrowLeft size={16} /> Back</button>
      <form className="login-card" onSubmit={(event) => { void submit(event); }}>
        <Logo />
        <p className="eyebrow">Coach workspace</p>
        <h2>Sign in</h2>
        <p>Use the email and password from your coach account.</p>
        <label>
          Email
          <input
            type="email"
            autoComplete="username"
            placeholder="coach@northside.edu"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-button login-submit" type="submit">Enter workspace</button>
        <button className="text-button demo-link" type="button" onClick={onRegister}>Create a coach account</button>
        <button className="text-button demo-link" type="button" onClick={onDemo}>Use the demo coach account</button>
      </form>
    </div>
  );
}

function CoachRegister({ onBack, onSignIn, onCreated }: { onBack: () => void; onSignIn: () => void; onCreated: (email: string) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [teamName, setTeamName] = useState("");
  const [season, setSeason] = useState("2026");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!name.trim() || !teamName.trim()) {
      setError("Enter your name and your team name.");
      return;
    }
    if (!normalized.includes("@") || !normalized.includes(".")) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Use a password of at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Those passwords don’t match.");
      return;
    }
    if (!/^\d{4}$/.test(season)) {
      setError("Enter the season as a four-digit year.");
      return;
    }
    const accounts = loadAccounts();
    if (accounts.some((account) => account.email === normalized) || loadPlayerAccounts().some((account) => account.email === normalized)) {
      setError("An account already uses that email. Sign in instead.");
      return;
    }
    const account: CoachAccount = {
      name: name.trim(),
      email: normalized,
      passwordHash: await hashPassword(password),
      teamName: teamName.trim(),
      season,
      teamCode: makeTeamCode(teamName),
    };
    localStorage.setItem("courtside.accounts", JSON.stringify([...accounts, account]));
    onCreated(account.email);
  }

  return (
    <div className="gate login-gate">
      <button className="back-link" onClick={onBack}><ArrowLeft size={16} /> Back</button>
      <form className="login-card" onSubmit={(event) => { void submit(event); }}>
        <Logo />
        <p className="eyebrow">Coach workspace</p>
        <h2>Create your team</h2>
        <p>This account stays in this browser. You’ll land in an empty workspace for your team.</p>
        <label>Your name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Alex Carter" autoComplete="name" /></label>
        <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="coach@school.edu" autoComplete="username" /></label>
        <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" autoComplete="new-password" /></label>
        <label>Confirm password<input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="Repeat your password" autoComplete="new-password" /></label>
        <label>Team name<input value={teamName} onChange={(event) => setTeamName(event.target.value)} placeholder="Northside Ravens" /></label>
        <label>Season<input value={season} onChange={(event) => setSeason(digits(event.target.value, 4))} inputMode="numeric" placeholder="2026" /></label>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-button login-submit" type="submit">Create account</button>
        <button className="text-button demo-link" type="button" onClick={onSignIn}>Already have an account? Sign in</button>
      </form>
    </div>
  );
}

function PlayerLogin({
  onBack,
  onRegister,
  onEnter,
}: {
  onBack: () => void;
  onRegister: () => void;
  onEnter: (email: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (loadAccounts().some((item) => item.email === normalized)) {
      setError("That email is a coach account. Sign in from I’m a coach.");
      return;
    }
    const account = loadPlayerAccounts().find((item) => item.email === normalized);
    if (!account) {
      setError("No player account uses that email. Create one to join your team.");
      return;
    }
    if (account.passwordHash !== await hashPassword(password)) {
      setError("That password doesn’t match this account.");
      return;
    }
    onEnter(account.email);
  }

  return (
    <div className="gate login-gate">
      <button className="back-link" onClick={onBack}><ArrowLeft size={16} /> Back</button>
      <form className="login-card" onSubmit={(event) => { void submit(event); }}>
        <Logo />
        <p className="eyebrow">Player access</p>
        <h2>Sign in</h2>
        <p>Use the email and password from your player account.</p>
        <label>Email<input type="email" autoComplete="username" placeholder="you@school.edu" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>Password<input type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-button login-submit" type="submit">Enter team</button>
        <button className="text-button demo-link" type="button" onClick={onRegister}>Create a player account</button>
      </form>
    </div>
  );
}

function PlayerRegister({ onBack, onSignIn, onCreated }: { onBack: () => void; onSignIn: () => void; onCreated: (email: string) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [number, setNumber] = useState("");
  const [position, setPosition] = useState<Position>("PG");
  const [teamCode, setTeamCode] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const normalized = email.trim().toLowerCase();
    const code = teamCode.trim().toUpperCase();
    if (!name.trim() || !number.trim()) {
      setError("Enter your name and jersey number.");
      return;
    }
    if (!normalized.includes("@") || !normalized.includes(".")) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Use a password of at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Those passwords don’t match.");
      return;
    }
    if (!teamByCode(code)) {
      setError("That team code doesn’t match a coach. Ask your coach for the code on their roster page.");
      return;
    }
    if (loadPlayerAccounts().some((account) => account.email === normalized) || loadAccounts().some((account) => account.email === normalized)) {
      setError("An account already uses that email. Sign in instead.");
      return;
    }
    const account: PlayerAccount = {
      name: name.trim(),
      email: normalized,
      passwordHash: await hashPassword(password),
      teamCode: code,
      number: number.trim(),
      position,
    };
    localStorage.setItem("courtside.playerAccounts", JSON.stringify([...loadPlayerAccounts(), account]));
    onCreated(account.email);
  }

  return (
    <div className="gate login-gate">
      <button className="back-link" onClick={onBack}><ArrowLeft size={16} /> Back</button>
      <form className="login-card" onSubmit={(event) => { void submit(event); }}>
        <Logo />
        <p className="eyebrow">Player access</p>
        <h2>Join your team</h2>
        <p>Use the team code from your coach. You’ll show up on their roster as soon as your account is created.</p>
        <label>Your name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Jordan Hale" autoComplete="name" /></label>
        <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@school.edu" autoComplete="username" /></label>
        <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" autoComplete="new-password" /></label>
        <label>Confirm password<input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="Repeat your password" autoComplete="new-password" /></label>
        <div className="field-row">
          <label>Jersey<input value={number} onChange={(event) => setNumber(digits(event.target.value, 2))} inputMode="numeric" placeholder="4" /></label>
          <label>Position
            <select value={position} onChange={(event) => setPosition(event.target.value as Position)}>
              {(["PG", "SG", "SF", "PF", "C"] as Position[]).map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
        </div>
        <label>Team code<input value={teamCode} onChange={(event) => setTeamCode(event.target.value.toUpperCase())} placeholder="RAVENS" autoCapitalize="characters" /></label>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-button login-submit" type="submit">Create account</button>
        <button className="text-button demo-link" type="button" onClick={onSignIn}>Already have an account? Sign in</button>
      </form>
    </div>
  );
}

type PlayerPage = "Home" | "Schedule" | "Results" | "Playbook" | "Team";

const playerNavigation: { label: PlayerPage; icon: typeof LayoutDashboard }[] = [
  { label: "Home", icon: LayoutDashboard },
  { label: "Schedule", icon: CalendarDays },
  { label: "Results", icon: Trophy },
  { label: "Playbook", icon: NotebookTabs },
  { label: "Team", icon: Users },
];

function lineupLabel(event: ScheduleEvent, playerId: string) {
  if (event.type !== "Game") return null;
  const lineup = event.lineup ?? [];
  if (lineup.length === 0) return { text: "Lineup not posted", kind: "open" as const };
  if (lineup.includes(playerId)) return { text: "You’re in", kind: "in" as const };
  return { text: "Not selected", kind: "out" as const };
}

function playerAverages(events: ScheduleEvent[], playerId: string) {
  const played = events.flatMap((event) => {
    const line = event.report?.stats.find((item) => item.playerId === playerId && item.played);
    return line ? [line] : [];
  });
  const average = (score: (line: StatLine) => number) => played.length === 0 ? "—" : (played.reduce((total, line) => total + score(line), 0) / played.length).toFixed(1);
  return { games: played.length, ppg: average(points), rpg: average((line) => line.reb), apg: average((line) => line.ast), spg: average((line) => line.stl) };
}

function savePlayerProfile(email: string, change: { name: string; number: string; position: Position }) {
  const accounts = loadPlayerAccounts();
  const account = accounts.find((item) => item.email === email);
  if (!account) return;
  account.name = change.name;
  account.number = change.number;
  account.position = change.position;
  localStorage.setItem("courtside.playerAccounts", JSON.stringify(accounts));
  const team = teamByCode(account.teamCode);
  if (!team) return;
  const roster = loadList<Player>(team.playersKey).map((player) => player.accountEmail === email ? { ...player, ...change } : player);
  localStorage.setItem(team.playersKey, JSON.stringify(roster));
}

function PlayerHome({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  const [page, setPage] = useState<PlayerPage>("Home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [noticesOpen, setNoticesOpen] = useState(false);
  const [view, setView] = useState<null | { type: "play"; id: string } | { type: "report"; id: string } | { type: "profile" }>(null);
  const [tick, setTick] = useState(0);
  const noticeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bump = () => setTick((value) => value + 1);
    window.addEventListener("focus", bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener("focus", bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  useEffect(() => {
    if (!noticesOpen) return;
    function close(event: MouseEvent) {
      if (!noticeRef.current?.contains(event.target as Node)) setNoticesOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [noticesOpen]);

  const account = loadPlayerAccounts().find((item) => item.email === email);
  if (!account) return null;
  const team = teamByCode(account.teamCode);
  const events = team ? loadList<ScheduleEvent>(team.eventsKey) : [];
  const plays = team ? loadList<Play>(team.playsKey) : [];
  const roster = team ? loadList<Player>(team.playersKey) : [];
  void tick;

  const me = roster.find((player) => player.accountEmail === account.email);
  const mine = me?.id ?? `acct:${account.email}`;
  const self = {
    id: mine,
    name: account.name,
    number: account.number,
    position: account.position,
    status: me?.status ?? "Ready",
    rating: me?.rating ?? "",
    review: me?.review ?? "",
  };
  const upcoming = events.filter(isUpcoming).sort(bySchedule);
  const next = upcoming[0];
  const nextGame = upcoming.find((event) => event.type === "Game");
  const games = events.filter(isResult).sort(byRecent);
  const averages = playerAverages(events, mine);
  const record = seasonRecord(events);
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const openPlay = plays.find((play) => view?.type === "play" && play.id === view.id);
  const openReport = events.find((event) => view?.type === "report" && event.id === view.id);

  const notices = [
    ...upcoming.filter((event) => event.type === "Game" && (event.lineup ?? []).length > 0).slice(0, 2).map((event) => {
      const status = lineupLabel(event, mine);
      return { id: `line-${event.id}`, title: status?.text ?? "Lineup posted", detail: `${event.title} · ${formatDate(event.date).label}`, go: () => setPage("Schedule") };
    }),
    ...upcoming.filter((event) => event.notes).slice(0, 3).map((event) => ({
      id: `note-${event.id}`,
      title: `Note for ${event.title}`,
      detail: event.notes,
      go: () => setPage("Schedule"),
    })),
    ...(self.review ? [{ id: "review", title: "Coach left you feedback", detail: self.rating ? `Rated ${self.rating} / 10` : "Open Home to read it", go: () => setPage("Home") }] : []),
  ];

  function go(nextPage: PlayerPage) {
    setPage(nextPage);
    setMenuOpen(false);
  }

  function eventRow(event: ScheduleEvent) {
    const when = formatDate(event.date);
    const status = lineupLabel(event, mine);
    const line = event.report?.stats.find((item) => item.playerId === mine);
    return (
      <article className="event-row" key={event.id}>
        <div className="event-date"><span>{when.day}</span><strong>{when.date}</strong></div>
        <div className={`event-stripe ${event.report ? `result-stripe-${resultOf(event.report)}` : eventAccent[event.type]}`} />
        <div className="event-info">
          <span className="tag">{event.type}{!event.report && daysUntil(event.date) === 0 ? " · Today" : !event.report && daysUntil(event.date) === 1 ? " · Tomorrow" : ""}</span>
          <h3>{event.title}</h3>
          <p><Clock3 size={14} /> {formatTime(event.time)} · {event.location}</p>
          {event.notes ? <p className="event-notes">{event.notes}</p> : null}
        </div>
        {event.report ? (
          <button className="score-chip" onClick={() => setView({ type: "report", id: event.id })}>
            <span className={`result-pill result-${resultOf(event.report)}`}>{resultOf(event.report)}</span>
            <strong>{event.report.teamScore}–{event.report.opponentScore}</strong>
            {line?.played && <em className="your-line">{points(line)} pts</em>}
          </button>
        ) : status ? (
          <span className={`availability is-${status.kind}`}>{status.text}</span>
        ) : <span />}
        {event.report ? (
          <button className="icon-button" aria-label={`Open ${event.title}`} onClick={() => setView({ type: "report", id: event.id })}><ChevronRight size={19} /></button>
        ) : <span />}
      </article>
    );
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "is-open" : ""}`}>
        <div className="sidebar-top">
          <Logo />
          <button className="icon-button mobile-close" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={19} /></button>
        </div>
        <div className="team-switcher is-static">
          <div className="team-badge">{initials(team?.name ?? "Team")}</div>
          <div>
            <strong>{team?.name ?? "No team"}</strong>
            <span>{team ? team.season : account.teamCode}</span>
          </div>
        </div>
        <nav>
          <p className="eyebrow nav-label">Your team</p>
          {playerNavigation.map(({ label, icon: Icon }) => (
            <button key={label} className={`nav-item ${page === label ? "active" : ""}`} onClick={() => go(label)}>
              <Icon size={19} strokeWidth={1.8} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <button className="season-card" onClick={() => go("Results")}>
          <div className="season-head">
            <div className="season-icon"><Trophy size={17} /></div>
            <div>
              <span>Your season</span>
              <strong>{averages.games === 0 ? "No games yet" : `${averages.ppg} PPG`}</strong>
            </div>
          </div>
          <small>{averages.games === 0 ? "Stats appear after your coach enters a result" : `${averages.games} game${averages.games === 1 ? "" : "s"} played`}</small>
        </button>
        <button className="nav-item" onClick={() => setView({ type: "profile" })}><UserRound size={19} /><span>My details</span></button>
        <button className="nav-item" onClick={onSignOut}><LogOut size={19} /><span>Sign out</span></button>
        <div className="coach-profile">
          <div className="avatar">{initials(account.name)}</div>
          <div><strong>{account.name}</strong><span>#{account.number} · {account.position}</span></div>
        </div>
      </aside>
      {menuOpen && <button className="backdrop" onClick={() => setMenuOpen(false)} aria-label="Close menu" />}
      <main>
        <header className="topbar">
          <button className="icon-button menu-button" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          <div>
            <p className="eyebrow">{team ? `${team.name} · ${team.season}` : "Player"}</p>
            <h1>{page}</h1>
          </div>
          <div className="topbar-actions">
            <div className="notice-wrap" ref={noticeRef}>
              <button className="icon-button notification" aria-label={`Updates${notices.length ? `, ${notices.length}` : ""}`} aria-expanded={noticesOpen} onClick={() => setNoticesOpen((open) => !open)}>
                <Bell size={19} />
                {notices.length > 0 && <span>{notices.length > 9 ? "9+" : notices.length}</span>}
              </button>
              {noticesOpen && (
                <div className="notice-pop" role="dialog" aria-label="Updates">
                  <strong>{notices.length === 0 ? "Nothing new" : `${notices.length} update${notices.length === 1 ? "" : "s"}`}</strong>
                  {notices.length === 0 ? (
                    <p>Lineups, coach notes, and feedback show up here.</p>
                  ) : (
                    <div className="notice-list">
                      {notices.map((notice) => (
                        <button key={notice.id} onClick={() => { setNoticesOpen(false); notice.go(); }}>
                          <strong>{notice.title}</strong>
                          <small>{notice.detail}</small>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="content">
          {page === "Home" && (
            <>
              <section className="hero">
                <div>
                  <p className="eyebrow light">{today}</p>
                  <h2>{greeting()}, {account.name.split(" ")[0]}.</h2>
                  <p>{team ? `Coach ${team.coach}.` : "Ask your coach to confirm the team code."} {next ? `Next up is ${next.title}.` : "Nothing is on the calendar yet."}</p>
                </div>
                <div className="hero-record">
                  <div><span>Team</span><strong>{record.games ? record.label : "0–0"}</strong></div>
                  <div><span>Your PPG</span><strong>{averages.ppg}</strong></div>
                  <div><span>Games</span><strong>{averages.games}</strong></div>
                </div>
              </section>
              <section className="stat-grid">
                <button className="stat-card" onClick={() => go("Schedule")}>
                  <div className="stat-icon lime"><CalendarDays size={21} /></div>
                  <div>
                    <span>Next event</span>
                    <strong>{next ? formatDate(next.date).label : "Nothing scheduled"}</strong>
                    <small>{next ? `${next.title} · ${formatTime(next.time)}` : "Your coach hasn’t added one"}</small>
                  </div>
                  <ChevronRight size={18} />
                </button>
                <button className="stat-card" onClick={() => go("Schedule")}>
                  <div className="stat-icon blue"><Users size={21} /></div>
                  <div>
                    <span>Next game</span>
                    <strong>{nextGame ? (lineupLabel(nextGame, mine)?.text ?? "Game day") : "No game coming up"}</strong>
                    <small>{nextGame ? opponentName(nextGame.title) : "Lineups appear here once posted"}</small>
                  </div>
                  <ChevronRight size={18} />
                </button>
                <button className="stat-card" onClick={() => go("Results")}>
                  <div className="stat-icon orange"><Trophy size={21} /></div>
                  <div>
                    <span>Last result</span>
                    <strong>{games[0]?.report ? `${resultOf(games[0].report)} ${games[0].report.teamScore}–${games[0].report.opponentScore}` : "No results yet"}</strong>
                    <small>{games[0] ? opponentName(games[0].title) : "After the game, the score shows up here"}</small>
                  </div>
                  <ChevronRight size={18} />
                </button>
              </section>
              <section className="dashboard-grid">
                <article className="panel">
                  <div className="panel-heading">
                    <div><p className="eyebrow">From your coach</p><h3>{self.review ? "Latest feedback" : "No feedback yet"}</h3></div>
                    {self.rating && <span className="theme-chip">{self.rating} / 10</span>}
                  </div>
                  <p className="detail-copy report-notes">{self.review || "When your coach writes a review, it stays here for you. Teammates can’t see it."}</p>
                </article>
                <article className="panel">
                  <div className="panel-heading">
                    <div><p className="eyebrow">Coming up</p><h3>{upcoming.length === 0 ? "Clear calendar" : `${upcoming.length} event${upcoming.length === 1 ? "" : "s"}`}</h3></div>
                    <button className="text-button" onClick={() => go("Schedule")}>Full schedule <ChevronRight size={15} /></button>
                  </div>
                  {upcoming.length === 0 ? (
                    <div className="panel-empty"><p>Practices, games, and coach notes will show up here.</p></div>
                  ) : upcoming.slice(0, 3).map((event) => (
                    <button className="task" key={event.id} onClick={() => go("Schedule")}>
                      <span className="custom-check" />
                      <span><strong>{event.title}</strong><small>{formatDate(event.date).label} · {formatTime(event.time)}{event.notes ? ` · ${event.notes}` : ""}</small></span>
                      <ChevronRight size={15} />
                    </button>
                  ))}
                </article>
              </section>
            </>
          )}

          {page === "Schedule" && (
            <section className="page-stack">
              <div className="section-intro">
                <div>
                  <p className="eyebrow">{upcoming.length === 0 ? "Nothing scheduled" : `${upcoming.length} upcoming`}</p>
                  <h2>Schedule</h2>
                  <p>Games, practices, and the notes your coach wants you to read. Games move to Results once they’ve been played.</p>
                </div>
              </div>
              {upcoming.length === 0 ? (
                <EmptyState title="Nothing coming up" detail="When your coach adds a practice or game, it shows up here with their notes." />
              ) : (
                <div className="schedule-list">{upcoming.map(eventRow)}</div>
              )}
            </section>
          )}

          {page === "Results" && (
            <section className="page-stack">
              <div className="section-intro">
                <div>
                  <p className="eyebrow">{team?.name ?? "Team"} · {record.games ? record.label : "0–0"}</p>
                  <h2>Results</h2>
                  <p>Final scores and your line from each game. Your row is highlighted in the box score.</p>
                </div>
              </div>
              <div className="summary-grid">
                <div><span>Points</span><strong>{averages.ppg}</strong><small>per game</small></div>
                <div><span>Rebounds</span><strong>{averages.rpg}</strong><small>per game</small></div>
                <div><span>Assists</span><strong>{averages.apg}</strong><small>per game</small></div>
                <div><span>Steals</span><strong>{averages.spg}</strong><small>per game you played</small></div>
              </div>
              {games.length === 0 ? (
                <EmptyState title="No games played yet" detail="Once a game is over and your coach enters the score, it appears here." />
              ) : (
                <div className="schedule-list">{games.map(eventRow)}</div>
              )}
            </section>
          )}

          {page === "Playbook" && (
            <PlayerPlaybook plays={plays} onOpen={(id) => setView({ type: "play", id })} />
          )}

          {page === "Team" && (
            <section className="page-stack">
              <div className="section-intro">
                <div>
                  <p className="eyebrow">{team ? `Coach ${team.coach}` : "Team"}</p>
                  <h2>{team?.name ?? "Your team"}</h2>
                  <p>{roster.length === 0 ? "You’re the first one here." : `${roster.length} player${roster.length === 1 ? "" : "s"} on the roster.`}</p>
                </div>
              </div>
              {roster.length === 0 ? (
                <EmptyState title="Roster not posted yet" detail="You’ll appear here after your coach opens the team. Your own details are under My details." />
              ) : (
                <div className="panel roster-table is-public">
                  <div className="table-head"><span>Player</span><span>Position</span><span>Status</span></div>
                  {roster.map((player) => {
                    const you = player.accountEmail === account.email || player.id === mine;
                    return (
                      <div className={`player-row ${you ? "is-you" : ""}`} key={player.id}>
                        <div className="player-name"><div className="avatar player-avatar">{initials(player.name)}</div><div><strong>{player.name}</strong><span>#{player.number}{you ? " · You" : ""}</span></div></div>
                        <strong>{player.position}</strong>
                        <span className={`status ${player.status.toLowerCase()}`}>{player.status}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      </main>

      {view?.type === "play" && openPlay && (
        <Modal title={openPlay.name} onClose={() => setView(null)} wide={Boolean(openPlay.videoUrl || openPlay.diagram)}>
          {openPlay.videoUrl ? <PlayVideo url={openPlay.videoUrl} /> : null}
          {openPlay.diagram ? <img className="diagram-preview" src={openPlay.diagram} alt="" /> : null}
          {!openPlay.videoUrl && !openPlay.diagram && <MiniCourt />}
          <p className="detail-line"><span className="tag">{openPlay.category}</span></p>
          <p className="detail-copy">{openPlay.notes || "No notes on this play yet."}</p>
          <div className="modal-actions">
            <button className="primary-button" onClick={() => setView(null)}>Close</button>
          </div>
        </Modal>
      )}
      {view?.type === "report" && openReport?.report && team && (
        <Modal title="Game report" onClose={() => setView(null)} wide>
          <ReportView event={openReport} teamName={team.name} highlightId={mine} />
        </Modal>
      )}
      {view?.type === "profile" && (
        <PlayerProfile account={account} onClose={() => setView(null)} onSaved={() => { setView(null); setTick((value) => value + 1); }} />
      )}
    </div>
  );
}

function PlayerPlaybook({ plays, onOpen }: { plays: Play[]; onOpen: (id: string) => void }) {
  const [filter, setFilter] = useState<(typeof playFilters)[number]>("All plays");
  const visible = plays.filter((play) => filter === "All plays" || play.category === filter);

  return (
    <section className="page-stack">
      <div className="section-intro">
        <div>
          <p className="eyebrow">{plays.length === 0 ? "Nothing in the book" : `${plays.length} play${plays.length === 1 ? "" : "s"}`}</p>
          <h2>Playbook</h2>
          <p>Watch the film and study the diagrams your coach put in the book.</p>
        </div>
      </div>
      {plays.length > 0 && (
        <div className="filter-row">
          {playFilters.map((option) => (
            <button key={option} className={`filter ${filter === option ? "active" : ""}`} onClick={() => setFilter(option)}>{option}</button>
          ))}
        </div>
      )}
      {visible.length === 0 ? (
        <EmptyState title={plays.length === 0 ? "No plays yet" : "Nothing in this view"} detail={plays.length === 0 ? "Plays your coach adds will show up here, including video." : "This category is empty."} />
      ) : (
        <div className="playbook-grid">
          {visible.map((play, index) => (
            <article className="play-card" key={play.id}>
              <button className={`diagram thumb-play variant-${index % 4} ${play.videoUrl ? "has-video" : ""}`} onClick={() => onOpen(play.id)} aria-label={play.videoUrl ? `Play ${play.name}` : `Open ${play.name}`}>
                <PlayArt play={play} />
                {play.videoUrl && <span><Play size={16} fill="currentColor" /></span>}
              </button>
              <button className="play-card-copy" onClick={() => onOpen(play.id)}>
                <span className="tag">{play.category}</span>
                <h3>{play.name}</h3>
                <p>{play.videoUrl ? "Video ready to play" : play.diagram ? "Diagram saved" : play.notes || "No notes yet"}</p>
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function PlayerProfile({
  account,
  onClose,
  onSaved,
}: {
  account: PlayerAccount;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(account.name);
  const [number, setNumber] = useState(account.number);
  const [position, setPosition] = useState<Position>(account.position);
  const [error, setError] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !number.trim()) {
      setError("Enter your name and jersey number.");
      return;
    }
    savePlayerProfile(account.email, { name: name.trim(), number, position });
    onSaved();
  }

  return (
    <Modal title="My details" onClose={onClose}>
      <form onSubmit={submit}>
        <p className="field-hint">Your coach sees this name and number on the roster. The team code stays {account.teamCode}.</p>
        <label>Name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
        <div className="field-row">
          <label>Jersey<input inputMode="numeric" value={number} onChange={(event) => setNumber(digits(event.target.value, 2))} /></label>
          <label>Position
            <select value={position} onChange={(event) => setPosition(event.target.value as Position)}>
              {(["PG", "SG", "SF", "PF", "C"] as Position[]).map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
        </div>
        <label>Email<input value={account.email} readOnly /></label>
        {error && <p className="field-error">{error}</p>}
        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onClose}>Cancel</button>
          <button className="primary-button" type="submit">Save</button>
        </div>
      </form>
    </Modal>
  );
}

function ReviewEditor({
  players,
  onClose,
  onSave,
}: {
  players: Player[];
  onClose: () => void;
  onSave: (id: string, rating: string, review: string) => void;
}) {
  const [selectedId, setSelectedId] = useState(players.find((player) => !player.review)?.id ?? players[0]?.id ?? "");
  const selected = players.find((player) => player.id === selectedId);
  const [rating, setRating] = useState(selected?.rating ?? "");
  const [review, setReview] = useState(selected?.review ?? "");
  const [error, setError] = useState("");

  function choose(id: string) {
    const player = players.find((item) => item.id === id);
    setSelectedId(id);
    setRating(player?.rating ?? "");
    setReview(player?.review ?? "");
    setError("");
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    const score = Number(rating);
    if (!rating || Number.isNaN(score) || score < 1 || score > 10) {
      setError("Rate the player from 1 to 10.");
      return;
    }
    if (!review.trim()) {
      setError("Write a short note the player can use.");
      return;
    }
    onSave(selected.id, rating, review.trim());
    const remaining = players.find((player) => player.id !== selected.id && !player.review);
    if (remaining) choose(remaining.id);
  }

  return (
    <form onSubmit={submit}>
      <div className="review-picks">
        {players.map((player) => (
          <button key={player.id} type="button" className={player.id === selectedId ? "active" : ""} onClick={() => choose(player.id)}>
            {player.name}
            <small>{player.review ? "Reviewed" : "Needs review"}</small>
          </button>
        ))}
      </div>
      <label>Rating out of 10<input inputMode="decimal" value={rating} placeholder="7.5" onChange={(event) => {
        const value = event.target.value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
        const [whole, fraction] = value.split(".");
        setRating(fraction === undefined ? whole.slice(0, 2) : `${whole.slice(0, 2)}.${fraction.slice(0, 1)}`);
      }} /></label>
      <label>Feedback<textarea value={review} onChange={(event) => setReview(event.target.value)} placeholder="What they did well, and one thing to work on." /></label>
      {error && <p className="field-error">{error}</p>}
      <div className="modal-actions">
        <button className="secondary-button" type="button" onClick={onClose}>Done</button>
        <button className="primary-button" type="submit">Save review</button>
      </div>
    </form>
  );
}

export default function App() {
  const [session, setSession] = useState<CoachSession | null>(() => loadSession());
  const [screen, setScreen] = useState<Screen>(() => {
    const current = loadSession();
    if (current?.kind === "player") return "player";
    return current ? "coach" : "home";
  });
  const [page, setPage] = useState<Page>("Overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [events, setEvents] = useState<ScheduleEvent[]>(() => {
    const current = loadSession();
    return current && current.kind !== "player" ? loadList(dataKey(current, "events")) : [];
  });
  const [plays, setPlays] = useState<Play[]>(() => {
    const current = loadSession();
    return current && current.kind !== "player" ? loadList(dataKey(current, "plays")) : [];
  });
  const [players, setPlayers] = useState<Player[]>(() => {
    const current = loadSession();
    return current && current.kind !== "player" ? loadList(dataKey(current, "players")) : [];
  });
  const [scouting, setScouting] = useState<ScoutReport[]>(() => {
    const current = loadSession();
    return current && current.kind !== "player" ? loadList(dataKey(current, "scouting")) : [];
  });
  const [, setClock] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setClock((value) => value + 1), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!session || session.kind === "player") return;
    localStorage.setItem(dataKey(session, "scouting"), JSON.stringify(scouting));
  }, [scouting, session]);

  useEffect(() => {
    if (!session || session.kind === "player") return;
    localStorage.setItem(dataKey(session, "events"), JSON.stringify(events));
  }, [events, session]);
  useEffect(() => {
    if (!session || session.kind === "player") return;
    localStorage.setItem(dataKey(session, "plays"), JSON.stringify(plays));
  }, [plays, session]);
  useEffect(() => {
    if (!session || session.kind === "player") return;
    localStorage.setItem(dataKey(session, "players"), JSON.stringify(players));
  }, [players, session]);
  useEffect(() => {
    if (!session || session.kind === "player") return;
    const code = teamCodeFor(session);
    const apply = () => setPlayers((current) => mergeRoster(code, current));
    apply();
    window.addEventListener("storage", apply);
    window.addEventListener("focus", apply);
    return () => {
      window.removeEventListener("storage", apply);
      window.removeEventListener("focus", apply);
    };
  }, [session]);

  function enter(next: WorkspaceSession) {
    setEvents(loadList(dataKey(next, "events")));
    setPlays(loadList(dataKey(next, "plays")));
    setPlayers(loadList(dataKey(next, "players")));
    setScouting(loadList(dataKey(next, "scouting")));
    setSession(next);
    sessionStorage.setItem("courtside.session", JSON.stringify(next));
    setPage("Overview");
    setScreen("coach");
  }

  function enterPlayer(email: string) {
    setSession({ kind: "player", email });
    sessionStorage.setItem("courtside.session", JSON.stringify({ kind: "player", email }));
    setScreen("player");
  }

  function signOut() {
    setMenuOpen(false);
    setDialog(null);
    setSession(null);
    sessionStorage.removeItem("courtside.session");
    setPage("Overview");
    setScreen("home");
  }

  const [teamDraft, setTeamDraft] = useState<{ teamName: string; season: string } | null>(null);
  const sessionKey = !session ? "none" : session.kind === "demo" ? "demo" : `${session.kind}:${session.email}`;
  useEffect(() => {
    setTeamDraft(null);
  }, [sessionKey]);
  const loadedProfile = session && session.kind !== "player" ? profileFor(session) : demoProfile;
  const profile = teamDraft ? { ...loadedProfile, ...teamDraft } : loadedProfile;
  const teamCode = session && session.kind !== "player" ? teamCodeFor(session) : demoTeamCode;
  const playerTeamCode = session?.kind === "player" ? loadPlayerAccounts().find((account) => account.email === session.email)?.teamCode : undefined;
  const themeCode = screen === "coach" ? teamCode : screen === "player" ? playerTeamCode : undefined;
  const [theme, setTheme] = useState<Theme>(() => themeCode ? loadTheme(themeCode) : themes[0]);

  useEffect(() => {
    setTheme(themeCode ? loadTheme(themeCode) : themes[0]);
  }, [themeCode]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function chooseTheme(next: Theme) {
    setTheme(next);
    localStorage.setItem(themeKey(teamCode), JSON.stringify(next));
  }

  const tasks = buildTasks(events, players, scouting, {
    result: (id) => { setPage("Results"); setDialog({ type: "report-form", id }); },
    event: (id) => { setPage("Schedule"); setDialog({ type: "event", id }); },
    roster: () => { setPage("Roster"); setDialog({ type: "reviews" }); },
    scout: (opponent) => { setPage("Scouting"); setDialog({ type: "scout-form", opponent }); },
  });
  const resultsDue = events.filter((event) => canReport(event) && !event.report).length;

  function saveScout(report: ScoutReport) {
    setScouting((current) => current.some((item) => item.id === report.id) ? current.map((item) => item.id === report.id ? report : item) : [report, ...current]);
    closeDialog();
  }

  function closeDialog() {
    setDialog(null);
  }

  function addKind(kind: "event" | "play" | "player") {
    const destination: Record<typeof kind, Page> = { event: "Schedule", play: "Playbook", player: "Roster" };
    setPage(destination[kind]);
    setDialog({ type: kind === "event" ? "event-form" : kind === "play" ? "play-form" : "player-form" });
  }

  function saveEvent(event: ScheduleEvent) {
    setEvents((current) => current.some((item) => item.id === event.id) ? current.map((item) => item.id === event.id ? event : item) : [event, ...current]);
    closeDialog();
  }

  function savePlay(play: Play) {
    setPlays((current) => current.some((item) => item.id === play.id) ? current.map((item) => item.id === play.id ? play : item) : [play, ...current]);
    closeDialog();
  }

  function savePlayer(player: Player) {
    setPlayers((current) => current.some((item) => item.id === player.id) ? current.map((item) => item.id === player.id ? player : item) : [player, ...current]);
    closeDialog();
  }

  const openEvent = events.find((event) => dialog?.type === "event" && event.id === dialog.id);
  const reportEvent = events.find((event) => (dialog?.type === "report" || dialog?.type === "report-form") && event.id === dialog.id);

  function setLineup(id: string, lineup: string[]) {
    setEvents((current) => current.map((event) => event.id === id ? { ...event, lineup } : event));
  }

  function saveReport(id: string, report: GameReport) {
    setEvents((current) => current.map((event) => event.id === id ? { ...event, report } : event));
    setDialog({ type: "report", id });
  }
  const openPlay = plays.find((play) => dialog?.type === "play" && play.id === dialog.id);
  const openPlayer = players.find((player) => dialog?.type === "player" && player.id === dialog.id);

  if (screen === "home") return <HomeScreen onCoach={() => setScreen("coach-login")} onPlayer={() => setScreen("player-login")} />;
  if (screen === "coach-login") {
    return (
      <CoachLogin
        onBack={() => setScreen("home")}
        onRegister={() => setScreen("coach-register")}
        onDemo={() => enter({ kind: "demo" })}
        onEnter={(email) => enter({ kind: "coach", email })}
      />
    );
  }
  if (screen === "coach-register") {
    return (
      <CoachRegister
        onBack={() => setScreen("home")}
        onSignIn={() => setScreen("coach-login")}
        onCreated={(email) => enter({ kind: "coach", email })}
      />
    );
  }
  if (screen === "player-login") {
    return <PlayerLogin onBack={() => setScreen("home")} onRegister={() => setScreen("player-register")} onEnter={enterPlayer} />;
  }
  if (screen === "player-register") {
    return <PlayerRegister onBack={() => setScreen("home")} onSignIn={() => setScreen("player-login")} onCreated={enterPlayer} />;
  }
  if (screen === "player" && session?.kind === "player") return <PlayerHome email={session.email} onSignOut={signOut} />;

  return (
    <div className="app-shell">
      <Sidebar
        page={page}
        setPage={setPage}
        open={menuOpen}
        setOpen={setMenuOpen}
        rosterCount={players.length}
        resultsDue={resultsDue}
        profile={profile}
        events={events}
        onSettings={() => setDialog({ type: "settings" })}
        onSignOut={signOut}
      />
      <main>
        <Header page={page} profile={profile} tasks={tasks} onMenu={() => setMenuOpen(true)} />
        <div className="content">
          {page === "Overview" && <Overview events={events} plays={plays} players={players} profile={profile} tasks={tasks} scouting={scouting} setPage={setPage} onAdd={addKind} onOpenEvent={(id) => { setPage("Schedule"); setDialog({ type: "event", id }); }} onOpenReport={(id) => setDialog({ type: "report", id })} />}
          {page === "Schedule" && <SchedulePage events={events} players={players} onAdd={() => setDialog({ type: "event-form" })} onOpen={(id) => setDialog({ type: "event", id })} onResults={() => setPage("Results")} />}
          {page === "Results" && <ResultsPage events={events} teamName={profile.teamName} onOpen={(id) => setDialog({ type: "report", id })} onReport={(id) => setDialog({ type: "report-form", id })} />}
          {page === "Playbook" && <PlaybookPage plays={plays} onAdd={() => setDialog({ type: "play-form" })} onOpen={(id) => setDialog({ type: "play", id })} />}
          {page === "Roster" && <RosterPage players={players} teamCode={teamCode} onAdd={() => setDialog({ type: "player-form" })} onOpen={(id) => setDialog({ type: "player", id })} onReview={() => setDialog({ type: "reviews" })} />}
          {page === "Scouting" && (
            <ScoutingPage
              reports={scouting}
              events={events}
              onNew={(opponent) => setDialog({ type: "scout-form", opponent })}
              onEdit={(report) => setDialog({ type: "scout-form", draft: report })}
              onDelete={(id) => setScouting((current) => current.filter((item) => item.id !== id))}
            />
          )}
        </div>
      </main>
      {dialog?.type === "settings" && (
        <Modal title="Settings" onClose={closeDialog}>
          <SettingsPanel
            profile={profile}
            teamCode={teamCode}
            theme={theme}
            onTheme={chooseTheme}
            onSaveTeam={(details) => {
              if (session && session.kind !== "player") saveTeamDetails(session, details);
              setTeamDraft(details);
            }}
            onClose={closeDialog}
          />
        </Modal>
      )}
      {dialog?.type === "scout-form" && (
        <Modal title={dialog.draft ? `Edit ${dialog.draft.opponent}` : "New scouting report"} onClose={closeDialog} wide>
          <ScoutForm initial={dialog.draft} opponent={dialog.opponent} onCancel={closeDialog} onSave={saveScout} />
        </Modal>
      )}
      {dialog?.type === "event-form" && <Modal title={dialog.draft ? "Edit event" : "Add event"} onClose={closeDialog}><EventForm initial={dialog.draft} onCancel={closeDialog} onSave={saveEvent} /></Modal>}
      {dialog?.type === "play-form" && <Modal title={dialog.draft ? "Edit play" : "New play"} onClose={closeDialog} wide><PlayForm initial={dialog.draft} onCancel={closeDialog} onSave={savePlay} /></Modal>}
      {dialog?.type === "player-form" && <Modal title={dialog.draft ? "Edit player" : "Add player"} onClose={closeDialog}><PlayerForm initial={dialog.draft} onCancel={closeDialog} onSave={savePlayer} /></Modal>}
      {dialog?.type === "event" && openEvent && (
        <Modal title={openEvent.title} onClose={closeDialog} wide={openEvent.type === "Game"}>
          <div className="event-detail">
            <span className={`event-stripe ${eventAccent[openEvent.type]}`} />
            <div>
              <span className="tag">{openEvent.type}</span>
              <p><CalendarDays size={15} /> {formatDate(openEvent.date).label} · {formatTime(openEvent.time)}</p>
              <p><ShieldCheck size={15} /> {openEvent.location}</p>
            </div>
          </div>
          <div className="report-section-head"><h4>Coach notes</h4><span>Players see these</span></div>
          <p className="detail-copy report-notes">{openEvent.notes || "No notes for players yet. Use Edit to add some."}</p>
          {openEvent.report && (
            <p className="detail-copy">
              <span className={`result-pill result-${resultOf(openEvent.report)}`}>{resultOf(openEvent.report)}</span>{" "}
              Final {openEvent.report.teamScore}–{openEvent.report.opponentScore}
            </p>
          )}
          {openEvent.type === "Game" && isUpcoming(openEvent) && (
            <LineupPicker players={players} lineup={openEvent.lineup ?? []} onChange={(ids) => setLineup(openEvent.id, ids)} />
          )}
          <div className="modal-actions">
            <button className="danger-button" onClick={() => { setEvents((current) => current.filter((item) => item.id !== openEvent.id)); closeDialog(); }}><Trash2 size={15} /> Delete</button>
            <button className="secondary-button" onClick={() => setDialog({ type: "event-form", draft: openEvent })}><Pencil size={15} /> Edit</button>
            {canReport(openEvent) && (
              openEvent.report
                ? <button className="primary-button" onClick={() => setDialog({ type: "report", id: openEvent.id })}><BarChart3 size={15} /> View result</button>
                : <button className="primary-button" onClick={() => setDialog({ type: "report-form", id: openEvent.id })}><BarChart3 size={15} /> Enter result</button>
            )}
          </div>
        </Modal>
      )}
      {dialog?.type === "report-form" && reportEvent && (
        <Modal title={reportEvent.report ? "Edit game report" : "Game report"} onClose={closeDialog} wide>
          <ReportForm event={reportEvent} players={players} teamName={profile.teamName} onCancel={closeDialog} onSave={(report) => saveReport(reportEvent.id, report)} onLineup={(ids) => setLineup(reportEvent.id, ids)} />
        </Modal>
      )}
      {dialog?.type === "report" && reportEvent?.report && (
        <Modal title="Game report" onClose={closeDialog} wide>
          <ReportView event={reportEvent} teamName={profile.teamName} />
          <div className="modal-actions">
            <button className="danger-button" onClick={() => { setEvents((current) => current.map((item) => item.id === reportEvent.id ? { ...item, report: undefined } : item)); closeDialog(); }}><Trash2 size={15} /> Delete report</button>
            <button className="primary-button" onClick={() => setDialog({ type: "report-form", id: reportEvent.id })}><Pencil size={15} /> Edit report</button>
          </div>
        </Modal>
      )}
      {dialog?.type === "play" && openPlay && (
        <Modal title={openPlay.name} onClose={closeDialog} wide={Boolean(openPlay.videoUrl || openPlay.diagram)}>
          {openPlay.videoUrl ? <PlayVideo url={openPlay.videoUrl} /> : null}
          {openPlay.diagram ? <img className="diagram-preview" src={openPlay.diagram} alt="" /> : null}
          {!openPlay.videoUrl && !openPlay.diagram && <MiniCourt />}
          <p className="detail-line"><span className="tag">{openPlay.category}</span></p>
          <p className="detail-copy">{openPlay.notes || "No notes yet."}</p>
          <div className="modal-actions">
            <button className="danger-button" onClick={() => { setPlays((current) => current.filter((item) => item.id !== openPlay.id)); closeDialog(); }}><Trash2 size={15} /> Delete</button>
            <button className="secondary-button" onClick={() => setDialog({ type: "play-form", draft: openPlay })}>Edit</button>
          </div>
        </Modal>
      )}
      {dialog?.type === "player" && openPlayer && (
        <Modal title={openPlayer.name} onClose={closeDialog}>
          <p className="detail-copy">#{openPlayer.number} · {openPlayer.position} · {openPlayer.status}</p>
          {openPlayer.accountEmail && <p className="field-hint">Joined with their own account ({openPlayer.accountEmail}).</p>}
          <p className="detail-copy">{openPlayer.rating ? `Last rating ${openPlayer.rating} / 10` : "No rating yet."}</p>
          <p className="detail-copy">{openPlayer.review || "No review written yet."}</p>
          <div className="modal-actions">
            {!openPlayer.accountEmail && <button className="danger-button" onClick={() => { setPlayers((current) => current.filter((item) => item.id !== openPlayer.id)); closeDialog(); }}><Trash2 size={15} /> Delete</button>}
            <button className="secondary-button" onClick={() => setDialog({ type: "player-form", draft: openPlayer })}>Edit</button>
            <button className="primary-button" onClick={() => setDialog({ type: "reviews" })}>Review</button>
          </div>
        </Modal>
      )}
      {dialog?.type === "reviews" && (
        <Modal title="Game reviews" onClose={closeDialog}>
          <ReviewEditor
            players={players}
            onClose={closeDialog}
            onSave={(id, rating, review) => {
              setPlayers((current) => current.map((player) => player.id === id ? { ...player, rating, review } : player));
            }}
          />
        </Modal>
      )}
    </div>
  );
}
