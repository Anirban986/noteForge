import { useState } from "react";
import "./RevisionNotes.css";
import Card from "../../../ui/Card/Card";
import Badge from "../../../ui/Badge/Badge";
import { NOTES_DATA, ALL_SUBJECTS, getTopicsForSubject, SUBJECT_COLORS } from "../../../../data/mockData";

/* ═══════════════════════════════
   Note Detail Viewer
═══════════════════════════════ */
function NoteDetailViewer({ note, onBack }) {
  const [mode,     setMode]     = useState("short");
  const [activeSub,setActiveSub]= useState(0);
  const [expanded, setExpanded] = useState({});

  const col = SUBJECT_COLORS[note.subject] || { color: "#3b5bdb", bg: "#eef2ff" };

  return (
    <div className="note-detail fade-up">
      {/* Breadcrumb */}
      <div className="note-detail__breadcrumb">
        <button className="note-detail__back" onClick={onBack}>← Back to Notes</button>
        <span>·</span>
        <span style={{ color: col.color, fontWeight: 500 }}>{note.subject}</span>
        <span>·</span>
        <span>{note.topic}</span>
      </div>

      {/* Header */}
      <div className="note-detail__header">
        <div className="note-detail__title-wrap">
          <div className="note-detail__icon" style={{ background: note.iconBg }}>{note.icon}</div>
          <div>
            <h1 className="note-detail__title">{note.chapter}</h1>
            <div className="note-detail__meta">
              <Badge color="accent" size="xs">{note.subject}</Badge>
              <span className="note-detail__meta-text">{note.pages} pages · {note.dateLabel}</span>
            </div>
          </div>
        </div>

        <div className="note-detail__mode-toggle">
          {["short", "detailed"].map(m => (
            <button key={m} className="note-detail__mode-btn"
              style={{ background: mode === m ? col.color : "#fff", color: mode === m ? "#fff" : "#5c6275" }}
              onClick={() => setMode(m)}>
              {m === "short" ? "Short Notes" : "Detailed"}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="note-detail__grid">
        <div>
          {/* Overview */}
          <Card className="note-overview-card" style={{ borderLeft: `3px solid ${col.color}` }}>
            <div className="note-overview-card__label" style={{ color: col.color }}>Overview</div>
            <p className="note-overview-card__text">{note.content.summary}</p>
          </Card>

          {/* Key Concepts */}
          <Card className="concept-card">
            <div className="concept-card__label">Key Concepts</div>
            {note.content.keyPoints.map((pt, i) => (
              <div key={i} className="concept-row">
                <div className="concept-row__inner">
                  <div className="concept-row__num" style={{ background: note.iconBg, color: col.color }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div className="concept-row__text">{pt}</div>
                    {mode === "detailed" && (
                      <>
                        {expanded[i] && (
                          <div className="concept-row__expansion" style={{ borderLeftColor: col.color }}>
                            {(note.detailedExpansions || [])[i] || "Detailed explanation coming soon."}
                          </div>
                        )}
                        <button className="concept-row__toggle" style={{ color: col.color }}
                          onClick={() => setExpanded(p => ({ ...p, [i]: !p[i] }))}>
                          {expanded[i] ? "▲ Collapse" : "▼ Read more"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </Card>

          {/* Formulas */}
          <div className="formulas-card">
            <div className="formulas-card__label">Important Formulas</div>
            {note.content.formulas.map((f, i) => (
              <div key={i} className="formula-item">{f}</div>
            ))}
          </div>
        </div>

        {/* Subtopic nav */}
        <div className="subtopic-nav">
          <div className="subtopic-nav__label">Subtopics</div>
          {note.content.subtopics.map((s, i) => (
            <div key={i}
              className={`subtopic-nav__item ${activeSub === i ? "subtopic-nav__item--active" : ""}`}
              style={{
                background:      activeSub === i ? note.iconBg : "transparent",
                color:           activeSub === i ? col.color : "#5c6275",
                borderLeftColor: activeSub === i ? col.color : "transparent",
              }}
              onClick={() => setActiveSub(i)}>
              {s}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════
   Revision Notes Library
═══════════════════════════════ */
export default function RevisionNotes() {
  const [subject, setSubject] = useState("All Subjects");
  const [topic,   setTopic]   = useState("All Topics");
  const [sortBy,  setSortBy]  = useState("recent");
  const [search,  setSearch]  = useState("");
  const [openNote,setOpenNote]= useState(null);

  const topicOptions = getTopicsForSubject(subject);

  const handleSubjectChange = s => { setSubject(s); setTopic("All Topics"); };

  const filtered = NOTES_DATA.filter(n => {
    const matchS = subject === "All Subjects" || n.subject === subject;
    const matchT = topic   === "All Topics"   || n.topic   === topic;
    const q = search.toLowerCase();
    const matchQ = !q || n.chapter.toLowerCase().includes(q)
      || n.subject.toLowerCase().includes(q)
      || n.tags.some(t => t.toLowerCase().includes(q));
    return matchS && matchT && matchQ;
  }).sort((a, b) =>
    sortBy === "recent"  ? b.addedTs - a.addedTs :
    sortBy === "subject" ? a.subject.localeCompare(b.subject) :
                           a.topic.localeCompare(b.topic)
  );

  if (openNote) return <NoteDetailViewer note={openNote} onBack={() => setOpenNote(null)} />;

  return (
    <div className="revision fade-up">
      <div className="revision__header">
        <h1 className="revision__title">Revision Notes</h1>
        <p className="revision__subtitle">Browse and study your AI-structured notes. Click any note to open the full viewer.</p>
      </div>

      {/* Filter bar */}
      <div className="revision__filter-bar">
        <div className="revision__filter-row">
          {/* Search */}
          <div className="revision__search-wrap">
            <span className="revision__search-icon">🔍</span>
            <input className="revision__search-input" value={search}
              onChange={e => setSearch(e.target.value)} placeholder="Search notes or topics…" />
          </div>

          <div className="revision__divider" />

          <span className="revision__filter-label">Subject</span>
          <div className="revision__pills">
            {ALL_SUBJECTS.map(s => {
              const active = subject === s;
              const col = SUBJECT_COLORS[s];
              return (
                <button key={s} className="revision__pill"
                  style={{
                    borderColor: active ? (col?.color || "#3b5bdb") : "#e3e6f0",
                    background:  active ? (col?.bg   || "#eef2ff") : "#fff",
                    color:       active ? (col?.color || "#3b5bdb") : "#5c6275",
                    fontWeight:  active ? 600 : 400,
                  }}
                  onClick={() => handleSubjectChange(s)}>
                  {s}
                </button>
              );
            })}
          </div>

          {/* Sort */}
          <div className="revision__sort">
            <span className="revision__filter-label">Sort</span>
            <select className="revision__sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="recent">Recently Added</option>
              <option value="subject">By Subject</option>
              <option value="topic">By Topic</option>
            </select>
          </div>
        </div>

        {/* Topic pills */}
        {subject !== "All Subjects" && topicOptions.length > 2 && (
          <div className="revision__topic-row">
            <span className="revision__filter-label">Topic</span>
            <div className="revision__pills">
              {topicOptions.map(tp => (
                <button key={tp} className="revision__pill"
                  style={{
                    borderColor: topic === tp ? "#3b5bdb" : "#e3e6f0",
                    background:  topic === tp ? "#eef2ff" : "#fff",
                    color:       topic === tp ? "#3b5bdb" : "#5c6275",
                    fontWeight:  topic === tp ? 600 : 400,
                  }}
                  onClick={() => setTopic(tp)}>
                  {tp}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Count */}
      <div className="revision__count">
        <strong style={{ color: "#1a1d2e" }}>{filtered.length}</strong>
        &nbsp;note{filtered.length !== 1 ? "s" : ""} found
        {subject !== "All Subjects" && <><span>·</span><span style={{ color: "#3b5bdb" }}>{subject}</span></>}
        {topic   !== "All Topics"   && <><span>·</span><span style={{ color: "#3b5bdb" }}>{topic}</span></>}
        {search && <><span>·</span><span>matching "<strong>{search}</strong>"</span></>}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="revision__empty">
          <div className="revision__empty-icon">📭</div>
          <div className="revision__empty-title">No notes found</div>
          <div className="revision__empty-sub">Try changing the subject or topic filter.</div>
        </div>
      ) : (
        <div className="revision__grid">
          {filtered.map((note, idx) => {
            const col = SUBJECT_COLORS[note.subject] || { color: "#3b5bdb", bg: "#eef2ff" };
            return (
              <Card key={note.id} hover className={`revision-card fade-up-${Math.min(idx,4)}`}
                onClick={() => setOpenNote(note)}>
                <div className="revision-card__bar" style={{ background: col.color }} />
                <div className="revision-card__header">
                  <div className="revision-card__icon" style={{ background: note.iconBg }}>{note.icon}</div>
                  <Badge color="gray" size="xs">{note.pages}p</Badge>
                </div>
                <div className="revision-card__title">{note.chapter}</div>
                <div className="revision-card__meta">
                  <span className="revision-card__subject" style={{ color: col.color }}>{note.subject}</span>
                  <span className="revision-card__topic">· {note.topic}</span>
                </div>
                <div className="revision-card__tags">
                  {note.tags.slice(0, 3).map(t => (
                    <span key={t} className="revision-card__tag"
                      style={{ background: note.iconBg, color: col.color }}>{t}</span>
                  ))}
                  {note.tags.length > 3 && (
                    <span style={{ fontSize: 11, color: "#9399a6" }}>+{note.tags.length - 3} more</span>
                  )}
                </div>
                <div className="revision-card__footer">
                  <span>🕐 {note.dateLabel}</span>
                  <span className="revision-card__cta" style={{ color: col.color }}>Open Notes →</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}