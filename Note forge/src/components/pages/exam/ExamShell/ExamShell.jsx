import { useState } from "react";
import "./ExamShell.css";
import ProgressBar from "../../../ui/ProgressBar/ProgressBar";
import { EXAMS } from "../../../../data/mockData";

import ExamDashboard from "../ExamDashboard/ExamDashboard";
import ExamUpload from "../ExamUpload/ExamUpload";
import RevisionNotes from "../RevisionNotes/RevisionNotes";
import MissingTopics from "../MissingTopics/MissingTopics";
import TopicAnalytics from "../TopicAnalytics/TopicAnalytics";
import MockTest from "../MockTest/MockTest";
import PreviousTests from "../PreviousTests/PreviousTests";


const NAV = [
  { key: "dashboard", icon: "⊞", label: "Dashboard" },
  { key: "upload", icon: "⬆", label: "Upload Notes" },
  { key: "revision", icon: "📖", label: "Revision Notes" },
  { key: "missing", icon: "⚠", label: "Missing Topics" },
  { key: "analytics", icon: "📊", label: "Topic Analytics" },
  { key: "mock", icon: "📝", label: "Mock Test" },
  { key: "previous", icon: "🕘", label: "Previous Tests" },
];

function ExamTopbar({ onExit, user, exam, setExam }) {
  const initials = user?.name
    ? user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";
  return (
    <div className="exam-topbar">
      <button className="exam-topbar__back" onClick={onExit}>
        ← Exit Exam Mode
      </button>
      <div className="exam-topbar__divider" />
      <span className="exam-topbar__label">⭐ Exam Mode</span>

      <div className="exam-topbar__right">
        <select
          className="exam-topbar__select"
          value={exam}
          onChange={e => setExam(e.target.value)}
        >
          {EXAMS.map(e => <option key={e}>{e}</option>)}
        </select>

        <div className="exam-topbar__notif">
          <button className="exam-topbar__notif-btn">🔔</button>
          <div className="exam-topbar__notif-dot" />
        </div>

        {user && (
          <div className="exam-topbar__avatar" title={user.name}>{initials}</div>
        )}


      </div>
    </div>
  );
}

function ExamSidebar({ page, setPage }) {
  return (
    <aside className="exam-sidebar">
      <div className="exam-sidebar__label">Navigation</div>

      {NAV.map(n => (
        <div
          key={n.key}
          className={`exam-sidebar__item ${page === n.key ? "exam-sidebar__item--active" : ""}`}
          onClick={() => setPage(n.key)}
        >
          <span className="exam-sidebar__item__icon">{n.icon}</span>
          {n.label}
        </div>
      ))}

      <div className="exam-sidebar__coverage">
        <div className="exam-sidebar__coverage-box">
          <div className="exam-sidebar__coverage-title">GATE 2026</div>
          <ProgressBar value={64} height={5} />
          <div className="exam-sidebar__coverage-sub">64% syllabus covered</div>
        </div>
      </div>
    </aside>
  );
}

export default function ExamShell({ onExit ,user}) {
  const [page, setPage] = useState("dashboard");
  const [exam, setExam] = useState(EXAMS[0]);

  const renderPage = () => {
    switch (page) {
      case "dashboard": return <ExamDashboard setPage={setPage} />;
      case "upload": return <ExamUpload />;
      case "revision": return <RevisionNotes />;
      case "missing": return <MissingTopics />;
      case "analytics": return <TopicAnalytics />;
      case "mock": return <MockTest />;
      case "previous": return <PreviousTests />;
      default: return <ExamDashboard setPage={setPage} />;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <ExamTopbar onExit={onExit} user={user} exam={exam} setExam={setExam} />
      <div className="exam-workspace">
        <ExamSidebar page={page} setPage={setPage} />
        <div className="exam-page-body">{renderPage()}</div>
      </div>
    </div>
  );
}