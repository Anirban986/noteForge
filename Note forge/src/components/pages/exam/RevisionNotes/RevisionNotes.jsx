/**
 * RevisionNotes.jsx — v4
 *
 * All chart data comes from note.weightageSnapshot and note.prediction
 * already embedded on the note document — no extra API calls.
 *
 * Field contract (from notes.service.js + notes.model.js):
 *   note._id               → Mongo ObjectId
 *   note.exam              → exam name string  e.g. "JEE Mains"
 *   note.subject           → subject string    e.g. "Physics"
 *   note.chapter           → chapter string    e.g. "Thermodynamics"
 *   note.mode              → "Exam" | "Normal"
 *   note.title             → AI-generated title
 *   note.overview          → AI-generated overview
 *   note.topics            → [ { topic, blocks[] } ]
 *   note.weightageSnapshot → [ { year, question_count, total_marks, weightage_pct } ]
 *   note.prediction        → { predicted_q_count, predicted_marks,
 *                              predicted_weightage, confidence_score } | null
 *   note.blockSummary      → { totalBlocks, concepts, keypoints, ... }
 */

import { useState, useEffect } from "react";
import "./RevisionNotes.css";
import Card from "../../../ui/Card/Card";
import api  from "../../../layout/api";

import WeightageSparkline from "../../../../components/charts/Weighatagesparksline";
import ChapterStatsPanel  from "../../../../components/charts/Chapterstatspanel";

// ─────────────────────────────────────────────────────────
//  Block renderer — unchanged
// ─────────────────────────────────────────────────────────
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
            <div key={i}><strong>{p.point}</strong> — {p.note}</div>
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
              <tr>{block.headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
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
          {block.branches.map((b, i) => <div key={i}>➤ {b.label}</div>)}
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
        <div className={`block callout ${block.variant}`}>{block.text}</div>
      );
    default:
      return null;
  }
}

// ─────────────────────────────────────────────────────────
//  Block summary badge strip  e.g. "12 blocks · 3 formulas"
// ─────────────────────────────────────────────────────────
function BlockSummaryBadges({ summary }) {
  if (!summary?.totalBlocks) return null;
  const parts = [];
  if (summary.totalBlocks) parts.push(`${summary.totalBlocks} blocks`);
  if (summary.concepts)    parts.push(`${summary.concepts} concepts`);
  if (summary.formulas)    parts.push(`${summary.formulas} formulas`);
  if (summary.tables)      parts.push(`${summary.tables} tables`);
  if (summary.flowcharts)  parts.push(`${summary.flowcharts} flowcharts`);
  return (
    <div className="rn-card__summary">
      {parts.join(" · ")}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  Note detail viewer
// ─────────────────────────────────────────────────────────
function NoteDetailViewer({ note, onBack }) {
  // Show stats panel only for exam-mode notes that have
  // a chapter AND at least one year of weightage history
  const hasStats = Boolean(
    note.mode === "Exam" &&
    note.chapter &&
    (note.weightageSnapshot?.length || note.prediction)
  );

  return (
    <div className="note-detail fade-up">
      <button className="note-detail__back" onClick={onBack}>← Back</button>

      {/* Breadcrumb meta row */}
      <div className="note-detail__meta">
        {note.exam    && <span className="note-detail__meta-exam">{note.exam}</span>}
        {note.subject && <span className="note-detail__meta-subject">{note.subject}</span>}
        {note.chapter && <span className="note-detail__meta-chapter">{note.chapter}</span>}
      </div>

      <h1>{note.title}</h1>
      <p className="note-overview">{note.overview}</p>

      {/*
        ChapterStatsPanel receives the full note object.
        It reads note.weightageSnapshot and note.prediction directly —
        zero additional API calls.
        Renders nothing if both arrays are empty.
      */}
      {hasStats && <ChapterStatsPanel note={note} />}

      {/* Block content */}
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

// ─────────────────────────────────────────────────────────
//  Main page
// ─────────────────────────────────────────────────────────
export default function RevisionNotes() {
  const [notes,    setNotes]    = useState([]);
  const [openNote, setOpenNote] = useState(null);
  const [search,   setSearch]   = useState("");
  const [examFilt, setExamFilt] = useState("All");
  const [subjFilt, setSubjFilt] = useState("All");
  const [loading,  setLoading]  = useState(true);

  // Fetch all exam-mode notes once
  // weightageSnapshot + prediction already embedded — no second fetch needed
  useEffect(() => {
    api.get("/api/notes/myNotes?mode=Exam")
      .then((res) => {
        setNotes(Array.isArray(res.data) ? res.data : res.data.notes || []);
      })
      .catch((err) => console.error("[RevisionNotes]", err))
      .finally(() => setLoading(false));
  }, []);

  // ── Filter options derived from note fields ──────────
  // note.exam is the "exam" field from ExamUpload FormData
  const examNames = [
    "All",
    ...new Set(notes.map((n) => n.exam).filter(Boolean)),
  ];
  const subjects = [
    "All",
    ...new Set(
      notes
        .filter((n) => examFilt === "All" || n.exam === examFilt)
        .map((n) => n.subject)
        .filter(Boolean)
    ),
  ];

  const handleExamChange = (ex) => {
    setExamFilt(ex);
    setSubjFilt("All");   // reset subject when exam changes
  };

  // ── Filter notes ─────────────────────────────────────
  const filtered = notes.filter((n) => {
    if (examFilt !== "All" && n.exam    !== examFilt) return false;
    if (subjFilt !== "All" && n.subject !== subjFilt) return false;
    if (search && !n.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // ── Open note detail ─────────────────────────────────
  if (openNote) {
    return (
      <NoteDetailViewer
        note={openNote}
        onBack={() => setOpenNote(null)}
      />
    );
  }

  return (
    <div className="revision fade-up">
      <h1>Revision Notes</h1>

      {/* Search */}
      <input
        className="revision__search"
        placeholder="Search notes..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Exam filter — top row */}
      {examNames.length > 1 && (
        <div className="filters filters--exam">
          {examNames.map((ex) => (
            <button
              key={ex}
              onClick={() => handleExamChange(ex)}
              className={examFilt === ex ? "active" : ""}
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      {/* Subject filter — second row */}
      <div className="filters">
        {subjects.map((s) => (
          <button
            key={s}
            onClick={() => setSubjFilt(s)}
            className={subjFilt === s ? "active" : ""}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && <div className="revision__loading">Loading notes…</div>}

      {/* Grid */}
      {!loading && (
        <div className="revision__grid">
          {filtered.length === 0 && (
            <div className="revision__empty">No notes match your filters.</div>
          )}
          {filtered.map((note) => (
            <Card key={note._id} hover onClick={() => setOpenNote(note)}>

              {/* Exam + subject badges */}
              <div className="rn-card__badges">
                {note.exam && (
                  <span className="rn-card__badge rn-card__badge--exam">
                    {note.exam}
                  </span>
                )}
                {note.subject && (
                  <span className="rn-card__badge rn-card__badge--subject">
                    {note.subject}
                  </span>
                )}
              </div>

              <h3 className="rn-card__title">{note.title}</h3>
              <small className="rn-card__chapter">{note.chapter}</small>

              {/* Block summary e.g. "8 blocks · 2 formulas" */}
              <BlockSummaryBadges summary={note.blockSummary} />

              {/*
                Sparkline — reads note.weightageSnapshot and note.prediction
                directly. No API call. Renders nothing if snapshot is empty.
              */}
              {note.mode === "Exam" && note.chapter && (
                <WeightageSparkline
                  history={note.weightageSnapshot}
                  prediction={note.prediction}
                  chapter={note.chapter}
                  exam={note.exam}
                />
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}