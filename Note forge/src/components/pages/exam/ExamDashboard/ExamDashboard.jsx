import "./ExamDashboard.css";
import Card from "../../../ui/Card/Card";
import Badge from "../../../ui/Badge/Badge";
import Button from "../../../ui/Button/Button";
import ProgressBar from "../../../ui/ProgressBar/ProgressBar";
import SectionTitle from "../../../ui/SectionTitle/SectionTitle";
import { MISSING_TOPICS } from "../../../../data/mockData";
import { useState, useEffect } from "react";
import api from "../../../layout/api";
const SCORE = 64;

// Target exam date
const EXAM_DATE = new Date(2027, 1, 8); // Month is 0-indexed: 1 = February

function getDaysRemaining(targetDate) {
  const today = new Date();
  // Zero out time components so we're counting whole calendar days
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfTarget = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.ceil((startOfTarget - startOfToday) / msPerDay);
}

// Simple subject -> icon/color mapping, with a sane fallback
const SUBJECT_STYLE = {
  "Theory of Computation":   { icon: "🔤", bg: "#eef2ff" },
  "Operating Systems":       { icon: "🖥️", bg: "#e7f5ff" },
  "DBMS":                    { icon: "🗄️", bg: "#fff4e6" },
  "Computer Networks":       { icon: "🌐", bg: "#e6fcf5" },
  "Data Structures":         { icon: "🌳", bg: "#f3f0ff" },
  "Algorithms":              { icon: "⚙️", bg: "#fff0f6" },
};
const DEFAULT_STYLE = { icon: "📄", bg: "#f0f2f8" };

const formatDate = iso => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const IMPORTANT_TOPICS = [
  { name: "Graph Algorithms",   weight: "15 marks", priority: "#e03131", coverage: 72 },
  { name: "OS Process Mgmt",    weight: "12 marks", priority: "#e8590c", coverage: 58 },
  { name: "DBMS Indexing",      weight: "11 marks", priority: "#e8590c", coverage: 45 },
  { name: "CN – TCP/IP Stack",  weight: "10 marks", priority: "#3b5bdb", coverage: 80 },
  { name: "TOC – PDA & CFG",    weight: "9 marks",  priority: "#3b5bdb", coverage: 35 },
  { name: "Compiler – Parsing", weight: "8 marks",  priority: "#3b5bdb", coverage: 30 },
];



export default function ExamDashboard({ setPage }) {
  const statusColor =
    SCORE < 40 ? "#e03131" : SCORE < 60 ? "#e8590c" : SCORE < 80 ? "#f59f00" : "#2f9e44";
  const statusLabel =
    SCORE < 40 ? "Poor" : SCORE < 60 ? "Average" : SCORE < 80 ? "Good" : "Ready";

  const daysToExam = getDaysRemaining(EXAM_DATE);

  const [count, setCount] = useState(null);
  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [notesError, setNotesError] = useState(null);

  useEffect(() => {
    const countDocs = async () => {
      try {
        const res = await api.get("/api/notes/countDocs");
        setCount(res.data.counts);
      } catch (err) {
        console.log(err);
      }
    };
    countDocs();
  }, []);

  useEffect(() => {
    const fetchRecentNotes = async () => {
      try {
        setNotesLoading(true);
        const res = await api.get("/api/notes/myNotes?mode=Exam");
        // Adjust this line if your API wraps the array differently
        // (e.g. res.data.notes vs res.data directly)
        const list = Array.isArray(res.data) ? res.data : res.data.notes || [];

        const sorted = [...list]
          .filter(n => !n.isDeleted)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 4);

        setNotes(sorted);
        setNotesError(null);
      } catch (err) {
        console.log(err);
        setNotesError("Couldn't load recent notes");
      } finally {
        setNotesLoading(false);
      }
    };
    fetchRecentNotes();
  }, []);

  const WEEK_STATS = [
    { icon: "📄", label: "Notes Processed", val: (count ? count.exam : 0) },
    { icon: "✅", label: "Topics Covered",  val: 0 },
    { icon: "📝", label: "Mock Tests",      val: 0 },
    { icon: "⏱", label: "Study Hours",     val: 0 },
  ];


  return (
    <div className="exam-dashboard fade-up">
      <div className="exam-dashboard__header">
        <h1 className="exam-dashboard__title">Exam Dashboard</h1>
        <p className="exam-dashboard__subtitle">GATE Computer Science · Target</p>
      </div>

      {/* Top row */}
      <div className="exam-stats-row">
        {/* Score */}
        <Card className="score-card" style={{ position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 12, right: 12, zIndex: 2 }}>
            <Badge color="orange">Under Development</Badge>
          </div>
          <div style={{ filter: "blur(4px)", pointerEvents: "none" }}>
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
          </div>
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
          <div className="countdown-card__number">{daysToExam}</div>
          <div className="countdown-card__sub">GATE — Feb 8</div>
          <div className="countdown-card__breakdown">
            {[["Topics Left","0"],["Mocks Needed","0"],["Revision Due","0"]].map(([l,v]) => (
              <div key={l} className="countdown-card__row">
                <span className="countdown-card__row-label">{l}</span>
                <span className="countdown-card__row-val">{v}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Alert */}
      <div className="exam-alert" style={{ position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 10, right: 10, zIndex: 2 }}>
          <Badge color="orange">Under Development</Badge>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", filter: "blur(4px)", pointerEvents: "none" }}>
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
      </div>

      {/* Bottom row */}
      <div className="two-col">
        {/* Important Topics */}
        <Card style={{ position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 12, right: 12, zIndex: 2 }}>
            <Badge color="orange">Under Development</Badge>
          </div>
          <div style={{ filter: "blur(4px)", pointerEvents: "none" }}>
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
          </div>
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

          {notesLoading && (
            <div style={{ padding: "16px 0", textAlign: "center", color: "#9399a6", fontSize: 13 }}>
              Loading recent notes…
            </div>
          )}

          {!notesLoading && notesError && (
            <div style={{ padding: "16px 0", textAlign: "center", color: "#e03131", fontSize: 13 }}>
              {notesError}
            </div>
          )}

          {!notesLoading && !notesError && notes.length === 0 && (
            <div style={{ padding: "16px 0", textAlign: "center", color: "#9399a6", fontSize: 13 }}>
              No notes yet — upload your first one below.
            </div>
          )}

          {!notesLoading && !notesError && notes.map(n => {
            const style = SUBJECT_STYLE[n.subject] || DEFAULT_STYLE;
            return (
              <div key={n.fileUrl || n._id} className="dash-recent-note" onClick={() => setPage("revision")}>
                <div className="dash-recent-note__icon" style={{ background: style.bg }}>
                  {style.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="dash-recent-note__title">{n.chapter}</div>
                  <div className="dash-recent-note__meta">
                    {n.subject} · {n.blockSummary?.totalBlocks ?? 0} blocks · {formatDate(n.createdAt)}
                  </div>
                </div>
                {n.aiStatus === "completed" ? (
                  <Badge color="accent" size="xs">AI</Badge>
                ) : n.aiStatus === "failed" ? (
                  <Badge color="red" size="xs">Failed</Badge>
                ) : (
                  <Badge color="gray" size="xs">Processing</Badge>
                )}
              </div>
            );
          })}

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