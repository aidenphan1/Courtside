import { useState } from "react";
import {
  BarChart3,
  Bell,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Clock3,
  FileText,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  NotebookTabs,
  Play,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
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

const roster = [
  { name: "Marcus Lee", number: 4, position: "PG", status: "Ready", score: 9.1, initials: "ML" },
  { name: "Jordan Bell", number: 7, position: "SG", status: "Ready", score: 8.6, initials: "JB" },
  { name: "Eli Brooks", number: 11, position: "SF", status: "Limited", score: 7.9, initials: "EB" },
  { name: "Noah Williams", number: 15, position: "PF", status: "Ready", score: 8.3, initials: "NW" },
  { name: "Theo Grant", number: 21, position: "C", status: "Ready", score: 8.8, initials: "TG" },
];

const plays = [
  { name: "Horns Twist", category: "Half court", success: 68, color: "#d9ff57" },
  { name: "Stack BLOB", category: "Baseline out", success: 74, color: "#ffbe7a" },
  { name: "Fist 5 Out", category: "Early offense", success: 61, color: "#94d9ff" },
  { name: "Diamond Press", category: "Defense", success: 57, color: "#c4a7ff" },
];

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
}: {
  page: Page;
  setPage: (page: Page) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
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
          <div className="team-badge">NR</div>
          <div>
            <strong>Northside Ravens</strong>
            <span>Varsity · 2026</span>
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
              {label === "Roster" && <small>12</small>}
            </button>
          ))}
        </nav>

        <div className="sidebar-spacer" />
        <div className="season-card">
          <div className="season-icon"><Trophy size={19} /></div>
          <div>
            <span>Season progress</span>
            <strong>12–4</strong>
          </div>
          <div className="progress"><span style={{ width: "72%" }} /></div>
          <small>8 games remaining</small>
        </div>
        <button className="nav-item"><Settings size={19} /><span>Settings</span></button>
        <div className="coach-profile">
          <div className="avatar">AC</div>
          <div><strong>Alex Carter</strong><span>Head Coach</span></div>
          <MoreHorizontal size={17} />
        </div>
      </aside>
      {open && <button className="backdrop" onClick={() => setOpen(false)} aria-label="Close menu" />}
    </>
  );
}

function Header({ page, onMenu }: { page: Page; onMenu: () => void }) {
  return (
    <header className="topbar">
      <button className="icon-button menu-button" onClick={onMenu} aria-label="Open menu"><Menu size={20} /></button>
      <div>
        <p className="eyebrow">Northside Ravens / Varsity</p>
        <h1>{page}</h1>
      </div>
      <div className="topbar-actions">
        <label className="search">
          <Search size={17} />
          <input placeholder="Search anything..." aria-label="Search" />
          <kbd>⌘ K</kbd>
        </label>
        <button className="icon-button notification" aria-label="Notifications"><Bell size={19} /><span /></button>
        <button className="primary-button"><Plus size={18} /> <span>Quick add</span></button>
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

function Overview({ setPage }: { setPage: (page: Page) => void }) {
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
          <div><span>Next game</span><strong>Wed, 7:30 PM</strong><small>vs. Eastview Tigers · Home</small></div>
          <button onClick={() => setPage("Schedule")}><ChevronRight size={18} /></button>
        </article>
        <article className="stat-card">
          <div className="stat-icon blue"><ClipboardList size={21} /></div>
          <div><span>Reviews due</span><strong>4 players</strong><small>From Friday’s game</small></div>
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
          <div className="matchup">
            <div className="team team-home"><div className="large-badge raven">NR</div><strong>Ravens</strong><span>12–4</span></div>
            <div className="versus">
              <p>Wed · Oct 14</p><strong>7:30</strong><span>PM</span><small>RAVENS ARENA</small>
            </div>
            <div className="team"><div className="large-badge tiger">ET</div><strong>Tigers</strong><span>10–6</span></div>
          </div>
          <div className="game-meta">
            <span><Clock3 size={15} /> Tip-off in 2 days</span>
            <span><ShieldCheck size={15} /> League game</span>
            <button onClick={() => setPage("Scouting")}>Open scouting report</button>
          </div>
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
          <MiniCourt />
          <div className="play-footer">
            <div><span className="tag">HALF COURT</span><h4>Horns Twist</h4><p>Edited 2 hours ago · 5 actions</p></div>
            <button className="round-play" onClick={() => setPage("Playbook")} aria-label="Open play"><Play size={18} fill="currentColor" /></button>
          </div>
        </article>

        <article className="panel performance-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">Last game</p><h3>Team performance</h3></div>
            <span className="win-pill">W&nbsp; 78–64</span>
          </div>
          <div className="performance-score">
            <div><span>Game rating</span><strong>8.4</strong><small>/ 10</small></div>
            <div className="trend"><TrendingUp size={17} /> +0.8</div>
          </div>
          <div className="metrics">
            <div><span>FG%</span><strong>48%</strong><i style={{ width: "72%" }} /></div>
            <div><span>Rebounds</span><strong>42</strong><i style={{ width: "81%" }} /></div>
            <div><span>Assists</span><strong>19</strong><i style={{ width: "64%" }} /></div>
          </div>
          <button className="secondary-button" onClick={() => setPage("Roster")}><BarChart3 size={17} /> Open game review</button>
        </article>
      </section>
    </>
  );
}

function SchedulePage() {
  const events = [
    { date: "14", day: "WED", title: "vs. Eastview Tigers", type: "Game", time: "7:30 PM", location: "Ravens Arena", accent: "lime" },
    { date: "16", day: "FRI", title: "Team practice", type: "Practice", time: "4:30 PM", location: "Main gym", accent: "blue" },
    { date: "17", day: "SAT", title: "Film session", type: "Review", time: "10:00 AM", location: "Team room", accent: "purple" },
    { date: "21", day: "WED", title: "@ Westbrook Lions", type: "Game", time: "6:45 PM", location: "Westbrook College", accent: "orange" },
  ];
  return (
    <section className="page-stack">
      <div className="section-intro"><div><p className="eyebrow">October 2026</p><h2>Upcoming schedule</h2><p>Games, practices, and team events in one place.</p></div><button className="primary-button"><Plus size={17} /> Add event</button></div>
      <div className="schedule-list">
        {events.map((event) => (
          <article className="event-row" key={event.date}>
            <div className="event-date"><span>{event.day}</span><strong>{event.date}</strong></div>
            <div className={`event-stripe ${event.accent}`} />
            <div className="event-info"><span className="tag">{event.type}</span><h3>{event.title}</h3><p><Clock3 size={14} /> {event.time} · {event.location}</p></div>
            <div className="attendance"><span>Availability</span><div className="avatar-stack"><i>ML</i><i>JB</i><i>NW</i><i>+7</i></div></div>
            <button className="icon-button"><ChevronRight size={19} /></button>
          </article>
        ))}
      </div>
    </section>
  );
}

function PlaybookPage() {
  return (
    <section className="page-stack">
      <div className="section-intro"><div><p className="eyebrow">24 saved plays</p><h2>Your playbook</h2><p>Build, organize, and share your team’s system.</p></div><button className="primary-button"><Plus size={17} /> New play</button></div>
      <div className="filter-row"><button className="filter active">All plays</button><button className="filter">Offense</button><button className="filter">Defense</button><button className="filter">Out of bounds</button><button className="filter">Press break</button></div>
      <div className="playbook-grid">
        {plays.map((play, index) => (
          <article className="play-card" key={play.name}>
            <div className={`diagram variant-${index}`}><MiniCourt /><button><Play size={16} fill="currentColor" /></button></div>
            <div className="play-card-copy"><span className="tag">{play.category}</span><h3>{play.name}</h3><p>Used in 8 games · {play.success}% efficiency</p><div className="efficiency"><i style={{ width: `${play.success}%`, background: play.color }} /></div></div>
          </article>
        ))}
      </div>
    </section>
  );
}

function RosterPage() {
  return (
    <section className="page-stack">
      <div className="section-intro"><div><p className="eyebrow">12 active players</p><h2>Team roster</h2><p>Track player development, availability, and game feedback.</p></div><button className="primary-button"><Plus size={17} /> Add player</button></div>
      <div className="roster-layout">
        <div className="panel roster-table">
          <div className="table-head"><span>Player</span><span>Position</span><span>Status</span><span>Last rating</span><span /></div>
          {roster.map((player) => (
            <div className="player-row" key={player.number}>
              <div className="player-name"><div className="avatar player-avatar">{player.initials}</div><div><strong>{player.name}</strong><span>#{player.number}</span></div></div>
              <strong>{player.position}</strong>
              <span className={`status ${player.status === "Ready" ? "ready" : "limited"}`}>{player.status}</span>
              <div className="rating"><strong>{player.score}</strong><span>/ 10</span></div>
              <button className="icon-button"><ChevronRight size={18} /></button>
            </div>
          ))}
        </div>
        <aside className="panel review-card">
          <div className="stat-icon blue"><ClipboardList size={21} /></div>
          <p className="eyebrow">Game reviews</p><h3>4 evaluations due</h3><p>Share clear, actionable feedback while Friday’s game is still fresh.</p>
          <div className="review-avatars"><span>ML</span><span>JB</span><span>EB</span><span>NW</span></div>
          <button className="primary-button">Start reviews <ChevronRight size={16} /></button>
        </aside>
      </div>
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

export default function App() {
  const [page, setPage] = useState<Page>("Overview");
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar page={page} setPage={setPage} open={menuOpen} setOpen={setMenuOpen} />
      <main>
        <Header page={page} onMenu={() => setMenuOpen(true)} />
        <div className="content">
          {page === "Overview" && <Overview setPage={setPage} />}
          {page === "Schedule" && <SchedulePage />}
          {page === "Playbook" && <PlaybookPage />}
          {page === "Roster" && <RosterPage />}
          {page === "Scouting" && <ScoutingPage />}
        </div>
      </main>
    </div>
  );
}
