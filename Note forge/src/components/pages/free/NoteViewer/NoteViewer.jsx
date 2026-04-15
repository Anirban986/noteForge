import { useState } from "react";
import Card from "../../../ui/Card/Card";
import "./NoteViewer.css";

export default function NoteViewer({ note, onBack }) {
  const [activeTopic, setActiveTopic] = useState(0);

  if (!note) return null;

  const topics = note.topics || [];

  return (
    <div className="note-viewer fade-up">

      {/* Header */}
      <div className="note-viewer__header">
        <button className="back-btn" onClick={onBack}>← Back</button>

        <div>
          <h1 className="note-title">{note.title || "Untitled Note"}</h1>
          <p className="note-overview">{note.overview}</p>
        </div>
      </div>

      <div className="note-viewer__layout">

        {/* Sidebar (Topics) */}
        <div className="note-sidebar">
          {topics.map((t, i) => (
            <div
              key={i}
              className={`topic-item ${activeTopic === i ? "active" : ""}`}
              onClick={() => setActiveTopic(i)}
            >
              {t.topic || `Topic ${i + 1}`}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="note-content">

          {(topics[activeTopic]?.blocks || []).map((block, idx) => {
            switch (block.type) {

              case "concept":
                return (
                  <Card key={idx} className="block concept">
                    <h3>{block.heading}</h3>
                    <p>{block.explanation}</p>
                  </Card>
                );

              case "keypoints":
                return (
                  <Card key={idx} className="block keypoints">
                    <h3>{block.heading}</h3>
                    <ul>
                      {block.points.map((p, i) => (
                        <li key={i}>
                          <strong>{p.point}</strong> — {p.note}
                        </li>
                      ))}
                    </ul>
                  </Card>
                );

              case "flowchart":
                return (
                  <Card key={idx} className="block flowchart">
                    <h3>{block.heading}</h3>
                    <div className="flow">
                      {block.steps.map((s, i) => (
                        <div key={i} className="flow-step">
                          <div className="circle">{i + 1}</div>
                          <div>
                            <strong>{s.label}</strong>
                            <p>{s.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                );

              case "table":
                return (
                  <Card key={idx} className="block table">
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
                  </Card>
                );

              case "mindmap":
                return (
                  <Card key={idx} className="block mindmap">
                    <h3>{block.heading}</h3>
                    <div className="mindmap-root">{block.root}</div>
                    <div className="mindmap-branches">
                      {block.branches.map((b, i) => (
                        <div key={i} className="branch">
                          <strong>{b.label}</strong>
                          <ul>
                            {b.children.map((c, j) => (
                              <li key={j}>{c.label}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </Card>
                );

              case "formula":
                return (
                  <Card key={idx} className="block formula">
                    <h3>{block.heading}</h3>
                    <div className="formula-box">{block.formula}</div>
                    <p>{block.meaning}</p>
                    {block.example && <p className="example">Example: {block.example}</p>}
                  </Card>
                );

              case "callout":
                return (
                  <div key={idx} className={`callout ${block.variant}`}>
                    {block.text}
                  </div>
                );

              default:
                return null;
            }
          })}
        </div>
      </div>
    </div>
  );
}