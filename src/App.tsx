import { FormEvent, PointerEvent as ReactPointerEvent, ReactNode, useEffect, useRef, useState } from "react";
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
  MoreHorizontal,
  NotebookTabs,
  Pencil,
  Play,
  Plus,
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

type Page = "Overview" | "Schedule" | "Playbook" | "Roster" | "Scouting";

const navigation: { label: Page; icon: typeof LayoutDashboard }[] = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Schedule", icon: CalendarDays },
  { label: "Playbook", icon: NotebookTabs },
  { label: "Roster", icon: Users },
  { label: "Scouting", icon: Target },
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
  level: string;
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
  level: string;
  season: string;
  demo: boolean;
};

const teamLevels = ["Varsity", "JV", "Club", "Rec"];
const demoProfile: CoachProfile = { name: "Alex Carter", teamName: "Northside Ravens", level: "Varsity", season: "2026", demo: true };
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

function dataKey(session: WorkspaceSession, kind: "events" | "plays" | "players") {
  if (session.kind === "demo") return `courtside.${kind}`;
  return `courtside.${encodeURIComponent(session.email)}.${kind}`;
}

function profileFor(session: CoachSession): CoachProfile {
  if (session.kind !== "coach") return demoProfile;
  const account = loadAccounts().find((item) => item.email === session.email);
  if (!account) return demoProfile;
  return { name: account.name, teamName: account.teamName, level: account.level, season: account.season, demo: false };
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
    return { name: demoProfile.teamName, coach: demoProfile.name, level: demoProfile.level, eventsKey: "courtside.events", playersKey: "courtside.players" };
  }
  const account = loadAccounts().find((item) => item.teamCode === normalized);
  if (!account) return null;
  const prefix = `courtside.${encodeURIComponent(account.email)}`;
  return { name: account.teamName, coach: account.name, level: account.level, eventsKey: `${prefix}.events`, playersKey: `${prefix}.players` };
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

function canReport(event: ScheduleEvent) {
  return event.type === "Game" && event.date <= todayISO();
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
  const today = todayISO();
  const aPast = a.date < today;
  const bPast = b.date < today;
  if (aPast !== bPast) return aPast ? 1 : -1;
  const aKey = `${a.date}T${a.time}`;
  const bKey = `${b.date}T${b.time}`;
  return aPast ? bKey.localeCompare(aKey) : aKey.localeCompare(bKey);
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
  profile,
}: {
  page: Page;
  setPage: (page: Page) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  onSignOut: () => void;
  onSettings: () => void;
  rosterCount: number;
  profile: CoachProfile;
}) {
  return (
    <>
      <aside className={`sidebar ${open ? "is-open" : ""}`}>
        <div className="sidebar-top">
          <Logo />
          <button className="icon-button mobile-close" onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={19} />
          </button>
        </div>

        <div className="team-switcher">
          <div className="team-badge">{initials(profile.teamName)}</div>
          <div>
            <strong>{profile.teamName}</strong>
            <span>{profile.level} · {profile.season}</span>
          </div>
          <MoreHorizontal size={18} />
        </div>

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
            </button>
          ))}
        </nav>

        <div className="sidebar-spacer" />
        <div className="season-card">
          <div className="season-icon"><Trophy size={19} /></div>
          {profile.demo ? (
            <>
              <div>
                <span>Season progress</span>
                <strong>12–4</strong>
              </div>
              <div className="progress"><span style={{ width: "72%" }} /></div>
              <small>8 games remaining</small>
            </>
          ) : (
            <>
              <div>
                <span>{profile.season} season</span>
                <strong>{profile.level}</strong>
              </div>
              <small>{rosterCount} player{rosterCount === 1 ? "" : "s"} on the roster</small>
            </>
          )}
        </div>
        <button className="nav-item" onClick={onSettings}><Settings size={19} /><span>Settings</span></button>
        <button className="nav-item" onClick={onSignOut}><LogOut size={19} /><span>Sign out</span></button>
        <div className="coach-profile">
          <div className="avatar">{initials(profile.name)}</div>
          <div><strong>{profile.name}</strong><span>Head Coach</span></div>
          <MoreHorizontal size={17} />
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
}: {
  page: Page;
  onMenu: () => void;
  profile: CoachProfile;
}) {
  const [noticesOpen, setNoticesOpen] = useState(false);

  return (
    <header className="topbar">
      <button className="icon-button menu-button" onClick={onMenu} aria-label="Open menu"><Menu size={20} /></button>
      <div>
        <p className="eyebrow">{profile.teamName} / {profile.level}</p>
        <h1>{page}</h1>
      </div>
      <div className="topbar-actions">
        <div className="notice-wrap">
          <button className="icon-button notification" aria-label="Notifications" aria-expanded={noticesOpen} onClick={() => setNoticesOpen((open) => !open)}>
            <Bell size={19} />
          </button>
          {noticesOpen && (
            <div className="notice-pop" role="status">
              <strong>Notifications</strong>
              <p>You’re all caught up. New reviews and schedule changes will show up here.</p>
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
}: {
  events: ScheduleEvent[];
  plays: Play[];
  players: Player[];
  setPage: (page: Page) => void;
  onAdd: (kind: "event" | "play" | "player") => void;
  onOpenEvent: (id: string) => void;
  onOpenReport: (id: string) => void;
}) {
  const next = events.filter((event) => event.date >= todayISO() && !event.report).sort(bySchedule)[0];
  const lastGame = latestReported(events);
  const lastTotals = lastGame?.report ? teamTotals(lastGame.report) : null;
  const latestPlay = plays[0];
  const reviewsLeft = players.filter((player) => !player.review).length;
  const nextDate = next ? formatDate(next.date) : null;
  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow light">Monday, October 12</p>
          <h2>Good afternoon, Coach.</h2>
          <p>Your team has a big week ahead. Here’s what needs your attention.</p>
        </div>
        <div className="hero-record">
          <div><span>Season record</span><strong>12–4</strong></div>
          <div><span>League rank</span><strong>#2</strong></div>
        </div>
      </section>

      <section className="stat-grid">
        <article className="stat-card">
          <div className="stat-icon lime"><CalendarDays size={21} /></div>
          <div>
            <span>Next event</span>
            <strong>{next ? `${nextDate?.label}` : "Nothing scheduled"}</strong>
            <small>{next ? `${next.title} · ${formatTime(next.time)}` : "Add a game or practice"}</small>
          </div>
          <button onClick={() => setPage("Schedule")}><ChevronRight size={18} /></button>
        </article>
        <article className="stat-card">
          <div className="stat-icon blue"><ClipboardList size={21} /></div>
          <div>
            <span>Roster</span>
            <strong>{players.length === 0 ? "No players" : `${reviewsLeft} to review`}</strong>
            <small>{players.length === 0 ? "Add your first player" : `${players.length} on the team`}</small>
          </div>
          <button onClick={() => setPage("Roster")}><ChevronRight size={18} /></button>
        </article>
        <article className="stat-card">
          <div className="stat-icon orange"><Target size={21} /></div>
          <div><span>Scouting</span><strong>80% complete</strong><small>Eastview Tigers</small></div>
          <button onClick={() => setPage("Scouting")}><ChevronRight size={18} /></button>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="panel next-game-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">Next up</p><h3>Game day countdown</h3></div>
            <button className="text-button" onClick={() => setPage("Schedule")}>View schedule <ChevronRight size={15} /></button>
          </div>
          {next ? (
            <>
              <div className="matchup">
                <div className="team team-home"><div className="large-badge raven">NR</div><strong>Ravens</strong><span>{next.type}</span></div>
                <div className="versus">
                  <p>{nextDate?.label}</p><strong>{formatTime(next.time).split(" ")[0]}</strong><span>{formatTime(next.time).split(" ")[1]}</span><small>{next.location}</small>
                </div>
                <div className="team"><div className="large-badge tiger">{initials(next.title)}</div><strong>{next.title}</strong><span>{next.type}</span></div>
              </div>
              <div className="game-meta">
                <span><Clock3 size={15} /> {formatTime(next.time)}</span>
                <span><ShieldCheck size={15} /> {next.type}</span>
                <button onClick={() => onOpenEvent(next.id)}>Open event</button>
              </div>
            </>
          ) : (
            <div className="panel-empty">
              <p>Your schedule is empty. Add a game, practice, or film session.</p>
              <button className="primary-button" onClick={() => onAdd("event")}><Plus size={16} /> Add an event</button>
            </div>
          )}
        </article>

        <article className="panel tasks-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">Focus</p><h3>Coach’s checklist</h3></div>
            <span className="counter">2 / 5</span>
          </div>
          {[
            ["Finalize Tigers scouting report", "Due tomorrow", true],
            ["Review Friday’s game film", "12 clips tagged", true],
            ["Complete player evaluations", "4 remaining", false],
            ["Share Wednesday’s game plan", "Not started", false],
            ["Confirm team availability", "10 of 12 replied", false],
          ].map(([title, detail, done]) => (
            <label className={`task ${done ? "done" : ""}`} key={title as string}>
              <input type="checkbox" defaultChecked={done as boolean} />
              <span className="custom-check" />
              <span><strong>{title}</strong><small>{detail}</small></span>
            </label>
          ))}
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
              <p>No game reports yet. After a game, add the score and player stats from the schedule.</p>
              <button className="primary-button" onClick={() => setPage("Schedule")}><CalendarDays size={16} /> Go to schedule</button>
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

function ReportView({ event, teamName }: { event: ScheduleEvent; teamName: string }) {
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
                  <tr key={line.playerId} className={line.played ? "" : "is-dnp"}>
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
        <label>Number<input value={number} onChange={(event) => setNumber(event.target.value)} placeholder="4" readOnly={Boolean(initial?.accountEmail)} /></label>
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

function EmptyState({ title, detail, action, onAction }: { title: string; detail: string; action: string; onAction: () => void }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>{detail}</p>
      <button className="primary-button" onClick={onAction}><Plus size={16} /> {action}</button>
    </div>
  );
}

function SchedulePage({
  events,
  players,
  onAdd,
  onOpen,
  onReport,
}: {
  events: ScheduleEvent[];
  players: Player[];
  onAdd: () => void;
  onOpen: (id: string) => void;
  onReport: (id: string) => void;
}) {
  const today = todayISO();
  const upcoming = events.filter((event) => event.date >= today && !event.report).sort(bySchedule);
  const results = events
    .filter((event) => event.date < today || event.report)
    .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`));
  const reported = results.filter((event) => event.report);
  const wins = reported.filter((event) => event.report && resultOf(event.report) === "W").length;
  const losses = reported.filter((event) => event.report && resultOf(event.report) === "L").length;

  function row(event: ScheduleEvent) {
    const when = formatDate(event.date);
    const report = event.report;
    return (
      <article className="event-row" key={event.id}>
        <div className="event-date"><span>{when.day}</span><strong>{when.date}</strong></div>
        <div className={`event-stripe ${eventAccent[event.type]}`} />
        <div className="event-info">
          <span className="tag">{event.type}</span>
          <h3>{event.title}</h3>
          <p><Clock3 size={14} /> {formatTime(event.time)} · {event.location}</p>
          {event.notes ? <p className="event-notes">{event.notes}</p> : null}
        </div>
        {report ? (
          <button className="score-chip" onClick={() => onOpen(event.id)}>
            <span className={`result-pill result-${resultOf(report)}`}>{resultOf(report)}</span>
            <strong>{report.teamScore}–{report.opponentScore}</strong>
          </button>
        ) : canReport(event) ? (
          <button className="report-chip" onClick={() => onReport(event.id)}><BarChart3 size={15} /> Add game report</button>
        ) : event.type === "Game" ? (
          <button className="report-chip" onClick={() => onOpen(event.id)}>
            {(event.lineup ?? []).length === 0 ? "Select players" : `${event.lineup?.length} playing`}
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
          <p>Games, practices, and team events in one place.</p>
        </div>
        <button className="primary-button" onClick={onAdd}><Plus size={17} /> Add event</button>
      </div>
      {upcoming.length === 0 ? (
        <EmptyState
          title="No upcoming events"
          detail="Add a game, practice, film session, or meeting and it will show up here."
          action="Add event"
          onAction={onAdd}
        />
      ) : (
        <div className="schedule-list">{upcoming.map(row)}</div>
      )}
      {results.length > 0 && (
        <>
          <div className="section-intro results-intro">
            <div>
              <p className="eyebrow">{reported.length === 0 ? "No reports yet" : `Record ${wins}–${losses}`}</p>
              <h2>Results</h2>
              <p>Completed games with the final score, box score, and your post-game notes.</p>
            </div>
          </div>
          <div className="schedule-list">{results.map(row)}</div>
        </>
      )}
    </section>
  );
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

function ScoutingPage() {
  return (
    <section className="page-stack">
      <div className="section-intro"><div><p className="eyebrow">Next opponent</p><h2>Eastview Tigers</h2><p>Wednesday, 7:30 PM · Ravens Arena</p></div><button className="primary-button"><FileText size={17} /> Export report</button></div>
      <div className="scout-hero">
        <div className="large-badge tiger">ET</div>
        <div><span className="tag">LEAGUE RANK #4</span><h3>Eastview Tigers</h3><p>10–6 overall · 6–3 away</p></div>
        <div className="scout-record"><span>Last 5</span><div><i className="w">W</i><i className="w">W</i><i className="l">L</i><i className="w">W</i><i className="l">L</i></div></div>
      </div>
      <div className="scout-grid">
        <article className="panel">
          <div className="panel-heading"><div><p className="eyebrow">Team profile</p><h3>Key tendencies</h3></div><Sparkles size={19} /></div>
          {[
            ["Transition offense", "Push after makes and misses", 86],
            ["Offensive rebounding", "Crash from both corners", 74],
            ["Three-point volume", "31 attempts per game", 68],
            ["Turnover pressure", "Aggressive denial defense", 79],
          ].map(([title, note, value]) => (
            <div className="tendency" key={title as string}><div><strong>{title}</strong><span>{note}</span></div><div className="tendency-bar"><i style={{ width: `${value}%` }} /></div></div>
          ))}
        </article>
        <article className="panel keys-card">
          <p className="eyebrow">Game plan</p><h3>Three keys to win</h3>
          <div><span>01</span><p><strong>Control the glass</strong>Send all five defenders to rebound before running.</p></div>
          <div><span>02</span><p><strong>Protect the corners</strong>Force their shooters above the break.</p></div>
          <div><span>03</span><p><strong>Value each possession</strong>Use pass fakes against their pressure.</p></div>
        </article>
      </div>
    </section>
  );
}

type Screen = "home" | "coach-login" | "coach-register" | "coach" | "player-login" | "player-register" | "player";

function HomeScreen({ onCoach, onPlayer }: { onCoach: () => void; onPlayer: () => void }) {
  return (
    <div className="gate">
      <header className="gate-nav">
        <Logo />
        <button className="gate-signin" onClick={onCoach}>Coach sign in</button>
      </header>
      <section className="gate-hero">
        <p className="eyebrow light">For coaches and players</p>
        <h2>Your season, in one place.</h2>
        <p>Playbooks, game reviews, the schedule, and scouting reports for the people who run the team.</p>
      </section>
      <section className="role-grid">
        <button className="role-card" onClick={onCoach}>
          <span className="role-icon"><Users size={22} /></span>
          <span className="tag">Available now</span>
          <strong>I’m a coach</strong>
          <span>Open the team workspace: playbook, roster, schedule, and scouting.</span>
          <em>Continue <ChevronRight size={15} /></em>
        </button>
        <button className="role-card" onClick={onPlayer}>
          <span className="role-icon"><UserRound size={22} /></span>
          <span className="tag">Available now</span>
          <strong>I’m a player</strong>
          <span>Join your team with the code from your coach, then see the schedule and game notes.</span>
          <em>Sign in <ChevronRight size={15} /></em>
        </button>
      </section>
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
  const [level, setLevel] = useState(teamLevels[0]);
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
      level,
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
        <div className="field-row">
          <label>Level
            <select value={level} onChange={(event) => setLevel(event.target.value)}>
              {teamLevels.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label>Season<input value={season} onChange={(event) => setSeason(event.target.value)} inputMode="numeric" placeholder="2026" /></label>
        </div>
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
          <label>Jersey<input value={number} onChange={(event) => setNumber(event.target.value)} inputMode="numeric" placeholder="4" /></label>
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

function PlayerHome({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((value) => value + 1);
    window.addEventListener("focus", bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener("focus", bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  const account = loadPlayerAccounts().find((item) => item.email === email);
  if (!account) return null;
  const team = teamByCode(account.teamCode);
  const events = team ? loadList<ScheduleEvent>(team.eventsKey) : [];
  const roster = team ? loadList<Player>(team.playersKey) : [];
  const me = roster.find((player) => player.accountEmail === account.email);
  const mine = me?.id ?? `acct:${account.email}`;
  const upcoming = events.filter((event) => event.date >= todayISO() && !event.report).sort(bySchedule);
  void tick;

  return (
    <div className="player-shell">
      <header className="player-bar">
        <Logo />
        <div>
          <p className="eyebrow">{team?.name ?? "Team"} / #{account.number} {account.position}</p>
          <h1>{account.name}</h1>
        </div>
        <button className="secondary-button" onClick={onSignOut}>Sign out</button>
      </header>
      <main className="content">
        <section className="hero player-hero">
          <div>
            <p className="eyebrow light">{team ? `${team.level} · Coach ${team.coach}` : "Team code not found"}</p>
            <h2>{team ? `You’re on the ${team.name}.` : "We couldn’t find that team."}</h2>
            <p>Your coach picks the lineup before each game. Notes they write on the schedule show up here.</p>
          </div>
        </section>
        <section className="page-stack">
          <div className="section-intro">
            <div>
              <p className="eyebrow">{upcoming.length === 0 ? "Nothing coming up" : `${upcoming.length} upcoming`}</p>
              <h2>Your schedule</h2>
            </div>
          </div>
          {upcoming.length === 0 ? (
            <p className="detail-copy">No upcoming events yet.</p>
          ) : (
            <div className="schedule-list">
              {upcoming.map((event) => {
                const when = formatDate(event.date);
                const playing = event.type === "Game" && (event.lineup ?? []).includes(mine);
                const decided = event.type === "Game" && (event.lineup ?? []).length > 0;
                return (
                  <article className="event-row" key={event.id}>
                    <div className="event-date"><span>{when.day}</span><strong>{when.date}</strong></div>
                    <div className={`event-stripe ${eventAccent[event.type]}`} />
                    <div className="event-info">
                      <span className="tag">{event.type}</span>
                      <h3>{event.title}</h3>
                      <p><Clock3 size={14} /> {formatTime(event.time)} · {event.location}</p>
                      {event.notes ? <p className="event-notes">{event.notes}</p> : <p className="event-notes">No coach notes for this one yet.</p>}
                    </div>
                    {event.type === "Game" && (
                      <span className={`result-pill ${playing ? "result-W" : "result-T"}`}>{playing ? "You’re in" : decided ? "Not selected" : "Lineup open"}</span>
                    )}
                  </article>
                );
              })}
            </div>
          )}
          <article className="panel">
            <p className="eyebrow">From your coach</p>
            <h3>{me?.review ? "Latest feedback" : "No feedback yet"}</h3>
            <p className="detail-copy">{me?.review || "Reviews your coach writes on the roster will show up here."}</p>
            {me?.rating && <p className="detail-copy">Last rating {me.rating} / 10</p>}
          </article>
        </section>
      </main>
    </div>
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
      <label>Rating out of 10<input type="number" min="1" max="10" step="0.1" value={rating} onChange={(event) => setRating(event.target.value)} /></label>
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

  const profile = session && session.kind !== "player" ? profileFor(session) : demoProfile;
  const teamCode = session && session.kind !== "player" ? teamCodeFor(session) : demoTeamCode;

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
        profile={profile}
        onSettings={() => setDialog({ type: "settings" })}
        onSignOut={signOut}
      />
      <main>
        <Header page={page} profile={profile} onMenu={() => setMenuOpen(true)} />
        <div className="content">
          {page === "Overview" && <Overview events={events} plays={plays} players={players} setPage={setPage} onAdd={addKind} onOpenEvent={(id) => { setPage("Schedule"); setDialog({ type: "event", id }); }} onOpenReport={(id) => setDialog({ type: "report", id })} />}
          {page === "Schedule" && <SchedulePage events={events} players={players} onAdd={() => setDialog({ type: "event-form" })} onOpen={(id) => setDialog({ type: "event", id })} onReport={(id) => setDialog({ type: "report-form", id })} />}
          {page === "Playbook" && <PlaybookPage plays={plays} onAdd={() => setDialog({ type: "play-form" })} onOpen={(id) => setDialog({ type: "play", id })} />}
          {page === "Roster" && <RosterPage players={players} teamCode={teamCode} onAdd={() => setDialog({ type: "player-form" })} onOpen={(id) => setDialog({ type: "player", id })} onReview={() => setDialog({ type: "reviews" })} />}
          {page === "Scouting" && <ScoutingPage />}
        </div>
      </main>
      {dialog?.type === "settings" && (
        <Modal title="Settings" onClose={closeDialog}>
          <p className="detail-copy">You’re signed in as {profile.name}, head coach of the {profile.teamName}.</p>
          <p className="detail-copy">{profile.level} · {profile.season}. Schedule, playbook, and roster changes stay in this browser.</p>
          <TeamCodeCard code={teamCode} />
          <div className="modal-actions">
            <button className="primary-button" onClick={closeDialog}>Close</button>
          </div>
        </Modal>
      )}
      {dialog?.type === "event-form" && <Modal title={dialog.draft ? "Edit event" : "Add event"} onClose={closeDialog}><EventForm initial={dialog.draft} onCancel={closeDialog} onSave={saveEvent} /></Modal>}
      {dialog?.type === "play-form" && <Modal title={dialog.draft ? "Edit play" : "New play"} onClose={closeDialog} wide><PlayForm initial={dialog.draft} onCancel={closeDialog} onSave={savePlay} /></Modal>}
      {dialog?.type === "player-form" && <Modal title={dialog.draft ? "Edit player" : "Add player"} onClose={closeDialog}><PlayerForm initial={dialog.draft} onCancel={closeDialog} onSave={savePlayer} /></Modal>}
      {dialog?.type === "event" && openEvent && (
        <Modal title={openEvent.title} onClose={closeDialog} wide={openEvent.type === "Game"}>
          <p className="detail-line"><span className="tag">{openEvent.type}</span></p>
          <p className="detail-copy">{formatDate(openEvent.date).label} · {formatTime(openEvent.time)}</p>
          <p className="detail-copy">{openEvent.location}</p>
          <p className="detail-line"><span className="tag">Coach notes</span></p>
          <p className="detail-copy">{openEvent.notes || "No notes for players yet."}</p>
          {openEvent.report && (
            <p className="detail-copy">
              <span className={`result-pill result-${resultOf(openEvent.report)}`}>{resultOf(openEvent.report)}</span>{" "}
              Final {openEvent.report.teamScore}–{openEvent.report.opponentScore}
            </p>
          )}
          {openEvent.type === "Game" && (
            <LineupPicker players={players} lineup={openEvent.lineup ?? []} onChange={(ids) => setLineup(openEvent.id, ids)} />
          )}
          {openEvent.type === "Game" && !canReport(openEvent) && <p className="field-hint">The game report opens on game day.</p>}
          <div className="modal-actions">
            <button className="danger-button" onClick={() => { setEvents((current) => current.filter((item) => item.id !== openEvent.id)); closeDialog(); }}><Trash2 size={15} /> Delete</button>
            <button className="secondary-button" onClick={() => setDialog({ type: "event-form", draft: openEvent })}>Edit</button>
            {canReport(openEvent) && (
              openEvent.report
                ? <button className="primary-button" onClick={() => setDialog({ type: "report", id: openEvent.id })}><BarChart3 size={15} /> View game report</button>
                : <button className="primary-button" onClick={() => setDialog({ type: "report-form", id: openEvent.id })}><BarChart3 size={15} /> Add game report</button>
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
