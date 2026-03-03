import { useState } from "react";
import "./MyNotesPage.css";
import Card from "../../../ui/Card/Card";
import Badge from "../../../ui/Badge/Badge";
import Button from "../../../ui/Button/Button";

const NOTES = [
  { ic:"📘", name:"Organic Chemistry Ch.4",       sub:"Chemistry",    tags:"Nucleophilic Sub.,Electrophiles", tc:"18 topics", date:"2h ago",    bc:"accent", bar:"#5b6af0" },
  { ic:"📗", name:"Data Structures & Algorithms",  sub:"CS",           tags:"Trees,Graphs,Sorting",           tc:"12 topics", date:"Yesterday",  bc:"green",  bar:"#2f9e44" },
  { ic:"📙", name:"Macroeconomics Week 3",          sub:"Economics",    tags:"Inflation,GDP,Policy",           tc:"9 topics",  date:"3 days ago", bc:"amber",  bar:"#f59f00" },
  { ic:"📕", name:"World History – WW2",            sub:"History",      tags:"Causes,Theaters,Aftermath",      tc:"7 topics",  date:"5 days ago", bc:"gray",   bar:"#9399a6" },
  { ic:"📓", name:"Linear Algebra",                 sub:"Mathematics",  tags:"Eigenvalues,Matrices",           tc:"10 topics", date:"1 week ago", bc:"red",    bar:"#e03131" },
];

const SUBJECTS = ["All", "Chemistry", "CS", "Economics", "History", "Mathematics"];

export default function MyNotesPage({ isPremium, onUpgrade }) {
  const [active, setActive] = useState("All");

  const filtered = active === "All" ? NOTES : NOTES.filter(n => n.sub === active);

  return (
    <div className="my-notes fade-up">
      <div className="my-notes__header">
        <h1 className="my-notes__title">My Notes</h1>
        <p className="my-notes__subtitle">All AI-structured notes in one place.</p>
      </div>

      <div className="my-notes__filters">
        {SUBJECTS.map(s => (
          <div
            key={s}
            className={`filter-chip ${active === s ? "filter-chip--active" : ""}`}
            onClick={() => setActive(s)}
          >
            {s}
          </div>
        ))}
      </div>

      <div className="my-notes__grid">
        {filtered.map(n => (
          <Card key={n.name} hover className="note-card">
            <div className="note-card__bar" style={{ background: n.bar }} />
            <div className="note-card__header">
              <div className="note-card__icon" style={{ background: "#eef2ff" }}>{n.ic}</div>
              <span className="note-card__menu">⋯</span>
            </div>
            <div className="note-card__title">{n.name}</div>
            <div className="note-card__tags">
              {n.tags.split(",").map(t => (
                <Badge key={t} color={n.bc} size="xs">{t}</Badge>
              ))}
            </div>
            <div className="note-card__footer">
              <span>📄 {n.tc}</span>
              <span>{n.date}</span>
            </div>
          </Card>
        ))}

        {/* Add slot — unlocked for premium, locked for free */}
        {isPremium ? (
          <div className="card note-card--add">
            <div className="note-card--add__plus">+</div>
            <div className="note-card--add__label">Upload new note</div>
            <Button variant="primary" size="sm">Upload PDF</Button>
          </div>
        ) : (
          <div className="card note-card--locked" onClick={onUpgrade}>
            <div className="note-card--locked__plus">+</div>
            <div className="note-card--locked__label">Limit reached</div>
            <Button variant="ghost" size="sm">Upgrade ✨</Button>
          </div>
        )}
      </div>
    </div>
  );
}