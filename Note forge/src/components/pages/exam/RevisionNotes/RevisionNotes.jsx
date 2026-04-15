import { useState, useEffect } from "react";
import "./RevisionNotes.css";
import Card from "../../../ui/Card/Card";
import Badge from "../../../ui/Badge/Badge";
import api from "../../../layout/api";

/* ═══════════════════════════════
   BLOCK RENDERER (DYNAMIC)
═══════════════════════════════ */
function BlockRenderer({ block }) {
  switch (block.type) {
    case "concept":
      return (
        <div className="block concept">
          <h3>{block.heading}</h3>
          <p>{block.explanation}</p>
        </div>
      );

    case "keypoints":
      return (
        <div className="block keypoints">
          <h3>{block.heading}</h3>
          {block.points.map((p, i) => (
            <div key={i}>
              <strong>{p.point}</strong> — {p.note}
            </div>
          ))}
        </div>
      );

    case "flowchart":
      return (
        <div className="block flowchart">
          <h3>{block.heading}</h3>
          {block.steps.map((s, i) => (
            <div key={i}>➡ {s.label} - {s.description}</div>
          ))}
        </div>
      );

    case "table":
      return (
        <div className="block table">
          <h3>{block.heading}</h3>
          <table>
            <thead>
              <tr>
                {block.headers.map((h, i) => <th key={i}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => <td key={j}>{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "mindmap":
      return (
        <div className="block mindmap">
          <h3>{block.heading}</h3>
          <p><strong>{block.root}</strong></p>
          {block.branches.map((b, i) => (
            <div key={i}>
              ➤ {b.label}
            </div>
          ))}
        </div>
      );

    case "formula":
      return (
        <div className="block formula">
          <h3>{block.heading}</h3>
          <code>{block.formula}</code>
          <p>{block.meaning}</p>
        </div>
      );

    case "callout":
      return (
        <div className={`block callout ${block.variant}`}>
          {block.text}
        </div>
      );

    default:
      return null;
  }
}

/* ═══════════════════════════════
   NOTE VIEWER
═══════════════════════════════ */
function NoteDetailViewer({ note, onBack }) {
  return (
    <div className="note-detail fade-up">

      <button className="note-detail__back" onClick={onBack}>
        ← Back
      </button>

      <h1>{note.title}</h1>
      <p className="note-overview">{note.overview}</p>

      {note.topics?.map((topic, i) => (
        <div key={i} className="topic-section">
          <h2>{topic.topic}</h2>

          {topic.blocks?.map((block, j) => (
            <BlockRenderer key={j} block={block} />
          ))}
        </div>
      ))}

    </div>
  );
}

/* ═══════════════════════════════
   MAIN PAGE
═══════════════════════════════ */
export default function RevisionNotes() {
  const [notes, setNotes] = useState([]);
  const [openNote, setOpenNote] = useState(null);
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("All");

  /*  Fetch Exam Notes */
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const res = await api.get("/api/notes/myNotes?mode=Exam");
        setNotes(res.data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchNotes();
  }, []);

  /*  Dynamic subjects */
  const subjects = ["All", ...new Set(notes.map(n => n.subject))];

  /*  Filtering */
  const filtered = notes.filter(n => {
    const matchSubject = subject === "All" || n.subject === subject;
    const matchSearch =
      !search ||
      n.title?.toLowerCase().includes(search.toLowerCase());

    return matchSubject && matchSearch;
  });

  if (openNote) {
    return <NoteDetailViewer note={openNote} onBack={() => setOpenNote(null)} />;
  }

  return (
    <div className="revision fade-up">

      <h1>Revision Notes</h1>

      {/* SEARCH */}
      <input
        placeholder="Search notes..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {/* SUBJECT FILTER */}
      <div className="filters">
        {subjects.map(s => (
          <button
            key={s}
            onClick={() => setSubject(s)}
            className={subject === s ? "active" : ""}
          >
            {s}
          </button>
        ))}
      </div>

      {/* GRID */}
      <div className="revision__grid">
        {filtered.map(note => (
          <Card
            key={note._id}
            hover
            onClick={() => setOpenNote(note)}
          >
            <h3>{note.title}</h3>
            <p>{note.subject}</p>
            <small>{note.chapter}</small>
          </Card>
        ))}
      </div>

    </div>
  );
}