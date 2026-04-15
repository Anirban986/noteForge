import { useState, useEffect } from "react";
import "./MyNotesPage.css";
import Card from "../../../ui/Card/Card";
import Badge from "../../../ui/Badge/Badge";
import Button from "../../../ui/Button/Button";
import api from "../../../layout/api";
import NoteViewer from "../NoteViewer/NoteViewer";

export default function MyNotesPage({ isPremium, onUpgrade }) {
  const [notes, setNotes] = useState([]);
  const [openNote, setOpenNote] = useState(null);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const res = await api.get("/api/notes/premium/myNotes?mode=Normal");
        setNotes(res.data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchNotes();
  }, []);

  //  If note is opened → show viewer
  if (openNote) {
    return (
      <NoteViewer
        note={openNote}
        onBack={() => setOpenNote(null)}
      />
    );
  }

  return (
    <div className="my-notes fade-up">
      <div className="my-notes__header">
        <h1 className="my-notes__title">My Notes</h1>
        <p className="my-notes__subtitle">
          All AI-structured notes in one place.
        </p>
      </div>

      <div className="my-notes__grid">
        {notes.map((n) => {
          const summary = n.blockSummary || {};

          const tags = [];
          if (summary.concepts) tags.push(`${summary.concepts} Concepts`);
          if (summary.keypoints) tags.push(`${summary.keypoints} Points`);
          if (summary.flowcharts) tags.push(`${summary.flowcharts} Flows`);
          if (summary.mindmaps) tags.push(`${summary.mindmaps} Mindmaps`);

          return (
            <Card
              key={n._id}
              hover
              className="note-card"
              onClick={() => setOpenNote(n)}   //  OPEN VIEWER
            >
              <div className="note-card__bar" style={{ background: "#5b6af0" }} />

              <div className="note-card__header">
                <div className="note-card__icon" style={{ background: "#eef2ff" }}>
                  📘
                </div>
                <span className="note-card__menu">⋯</span>
              </div>

              <div className="note-card__title">
                {n.title || n.OriginalFileName}
              </div>

              {n.overview && (
                <div className="note-preview">
                  {n.overview.slice(0, 80)}...
                </div>
              )}

              <div className="note-card__tags">
                {tags.map((t, i) => (
                  <Badge key={i} color="accent" size="xs">
                    {t}
                  </Badge>
                ))}
              </div>

              <div className="note-card__footer">
                <span>📄 {summary.totalBlocks || 0} blocks</span>
                <span>{new Date(n.createdAt).toLocaleDateString()}</span>
              </div>
            </Card>
          );
        })}

        {isPremium ? (
          <div className="card note-card--add">
            <div className="note-card--add__plus">+</div>
            <div className="note-card--add__label">Upload new note</div>
            <Button variant="primary" size="sm">
              Upload PDF
            </Button>
          </div>
        ) : (
          <div className="card note-card--locked" onClick={onUpgrade}>
            <div className="note-card--locked__plus">+</div>
            <div className="note-card--locked__label">Limit reached</div>
            <Button variant="ghost" size="sm">
              Upgrade ✨
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}