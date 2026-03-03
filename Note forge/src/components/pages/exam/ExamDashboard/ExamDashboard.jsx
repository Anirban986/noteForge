import "./ExamDashboard.css";
import Card from "../../../ui/Card/Card";
import Badge from "../../../ui/Badge/Badge";
import Button from "../../../ui/Button/Button";
import ProgressBar from "../../../ui/ProgressBar/ProgressBar";
import SectionTitle from "../../../ui/SectionTitle/SectionTitle";
import { NOTES_DATA, MISSING_TOPICS } from "../../../../data/mockData";

const SCORE = 64;

const IMPORTANT_TOPICS = [
  { name: "Graph Algorithms",   weight: "15 marks", priority: "#e03131", coverage: 72 },
  { name: "OS Process Mgmt",    weight: "12 marks", priority: "#e8590c", coverage: 58 },
  { name: "DBMS Indexing",      weight: "11 marks", priority: "#e8590c", coverage: 45 },
  { name: "CN – TCP/IP Stack",  weight: "10 marks", priority: "#3b5bdb", coverage: 80 },
  { name: "TOC – PDA & CFG",    weight: "9 marks",  priority: "#3b5bdb", coverage: 35 },
  { name: "Compiler – Parsing", weight: "8 marks",  priority: "#3b5bdb", coverage: 30 },
];

const WEEK_STATS = [
  { icon: "📄", label: "Notes Processed", val: 8  },
  { icon: "✅", label: "Topics Covered",  val: 23 },
  { icon: "📝", label: "Mock Tests",      val: 2  },
  { icon: "⏱", label: "Study Hours",     val: 14 },
];

export default function ExamDashboard({ setPage }) {
  const statusColor =
    SCORE < 40 ? "#e03131" : SCORE < 60 ? "#e8590c" : SCORE < 80 ? "#f59f00" : "#2f9e44";
  const statusLabel =
    SCORE < 40 ? "Poor" : SCORE < 60 ? "Average" : SCORE < 80 ? "Good" : "Ready";

  const recentNotes = [...NOTES_DATA].sort((a, b) => b.addedTs - a.addedTs).slice(0, 4);

  return (
    <div className="exam-dashboard fade-up">
      <div className="exam-dashboard__header">
        <h1 className="exam-dashboard__title">Exam Dashboard</h1>
        <p className="exam-dashboard__subtitle">GATE Computer Science · 2026 Target</p>
      </div>

      {/* Top row */}
      <div className="exam-stats-row">
        {/* Score */}
        <Card className="score-card">
          <div className="score-card__orb" />
          <div className="score-card__label">Preparation Score</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginBottom: 14 }}>
            <span className="score-card__number">{SCORE}</span>
            <div style={{ paddingBottom: 8 }}>
              <span className="score-card__denom">/ 100</span>
              <div style={{ marginTop: 4 }}>
                <Badge color={SCORE < 60 ? "orange" : "accent"}>{statusLabel}</Badge>
              </div>
            </div>
          </div>
          <ProgressBar value={SCORE} color={statusColor} height={8} />
          <div className="score-card__sub">64% syllabus covered</div>
        </Card>

        {/* Week activity */}
        <Card>
          <div className="week-card__label">This Week</div>
          {WEEK_STATS.map(s => (
            <div key={s.label} className="week-card__row">
              <span className="week-card__row-label">{s.icon} {s.label}</span>
              <span className="week-card__row-val">{s.val}</span>
            </div>
          ))}
        </Card>

        {/* Countdown */}
        <Card className="countdown-card">
          <div className="countdown-card__label">Days to Exam</div>
          <div className="countdown-card__number">47</div>
          <div className="countdown-card__sub">GATE 2026 — Feb 1–2</div>
          <div className="countdown-card__breakdown">
            {[["Topics Left","18"],["Mocks Needed","6"],["Revision Due","12"]].map(([l,v]) => (
              <div key={l} className="countdown-card__row">
                <span className="countdown-card__row-label">{l}</span>
                <span className="countdown-card__row-val">{v}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Alert */}
      <div className="exam-alert">
        <span className="exam-alert__icon">⚠️</span>
        <div style={{ flex: 1 }}>
          <div className="exam-alert__title">4 High-Priority Topics Not Covered</div>
          <div className="exam-alert__badges">
            {MISSING_TOPICS.high.map(t => <Badge key={t} color="red">{t}</Badge>)}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setPage("missing")}
          style={{ color: "#e03131", background: "rgba(224,49,49,0.1)", flexShrink: 0 }}
        >
          View All →
        </Button>
      </div>

      {/* Bottom row */}
      <div className="two-col">
        {/* Important Topics */}
        <Card>
          <SectionTitle action={
            <Button variant="ghost" size="sm" onClick={() => setPage("analytics")}>
              See Analytics →
            </Button>
          }>
            Important Topics
          </SectionTitle>
          {IMPORTANT_TOPICS.map(t => (
            <div key={t.name} className="topic-row">
              <div className="topic-row__bar" style={{ background: t.priority }} />
              <div style={{ flex: 1 }}>
                <div className="topic-row__name">{t.name}</div>
                <div className="topic-row__weight">{t.weight}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="topic-row__pct">{t.coverage}%</div>
                <div className="topic-row__pct-label">covered</div>
              </div>
            </div>
          ))}
        </Card>

        {/* Recent Notes */}
        <Card>
          <SectionTitle action={
            <Button variant="ghost" size="sm" onClick={() => setPage("revision")}>
              View Notes →
            </Button>
          }>
            Recent Notes
          </SectionTitle>
          {recentNotes.map(n => (
            <div key={n.id} className="dash-recent-note" onClick={() => setPage("revision")}>
              <div className="dash-recent-note__icon" style={{ background: n.iconBg }}>
                {n.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="dash-recent-note__title">{n.chapter}</div>
                <div className="dash-recent-note__meta">
                  {n.subject} · {n.pages}p · {n.dateLabel}
                </div>
              </div>
              <Badge color="accent" size="xs">AI</Badge>
            </div>
          ))}
          <div style={{ padding: "10px 0", textAlign: "center" }}>
            <Button variant="ghost" size="sm" onClick={() => setPage("upload")}>
              + Upload New Notes
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}