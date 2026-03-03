import { useState } from "react";
import "./MissingTopics.css";
import Card from "../../../ui/Card/Card";
import Badge from "../../../ui/Badge/Badge";
import Button from "../../../ui/Button/Button";
import ProgressBar from "../../../ui/ProgressBar/ProgressBar";
import SectionTitle from "../../../ui/SectionTitle/SectionTitle";
import { MISSING_TOPICS } from "../../../../data/mockData";

const SECTIONS = [
  { key: "high",   label: "High Priority",   color: "red",    icon: "🔴", barColor: "#e03131" },
  { key: "medium", label: "Medium Priority", color: "orange", icon: "🟠", barColor: "#e8590c" },
  { key: "low",    label: "Low Priority",    color: "gray",   icon: "🔵", barColor: "#9399a6" },
];

const STAT_COLORS = ["#3b5bdb", "#e03131", "#e8590c"];

export default function MissingTopics() {
  const [generating, setGenerating] = useState(null);

  const generate = topic => {
    setGenerating(topic);
    setTimeout(() => setGenerating(null), 2000);
  };

  return (
    <div className="missing fade-up">
      <div className="missing__header">
        <h1 className="missing__title">Missing Topics</h1>
        <p className="missing__subtitle">Topics from GATE syllabus not yet covered by your uploaded notes.</p>
      </div>

      {/* Stats */}
      <div className="missing__stats">
        {[
          { label:"Syllabus Covered", val:"64%", sub:"64 of 100 units" },
          { label:"Missing Topics",   val:"14",  sub:"Need attention"  },
          { label:"Est. Study Time",  val:"38h", sub:"To full coverage"},
        ].map((s, i) => (
          <Card key={s.label} hover>
            <div className="missing__stat-label">{s.label}</div>
            <div className="missing__stat-val" style={{ color: STAT_COLORS[i] }}>{s.val}</div>
            <div className="missing__stat-sub">{s.sub}</div>
          </Card>
        ))}
      </div>

      <div style={{ marginBottom: 20 }}>
        <ProgressBar value={64} height={10} label="Overall Syllabus Coverage" />
      </div>

      {SECTIONS.map(sec => (
        <Card key={sec.key} className="missing__section">
          <div className="missing__section-header">
            <span>{sec.icon}</span>
            <span className="missing__section-title">{sec.label}</span>
            <Badge color={sec.color} size="xs">{MISSING_TOPICS[sec.key].length} topics</Badge>
          </div>

          {MISSING_TOPICS[sec.key].map(topic => (
            <div key={topic} className="missing__topic-row">
              <div style={{ flex: 1 }}>
                <div className="missing__topic-name">{topic}</div>
                <div className="missing__topic-meta">Not in any uploaded note · GATE weightage: high</div>
              </div>

              {generating === topic ? (
                <div className="missing__generating">
                  <div className="missing__spin spin" />
                  Generating…
                </div>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => generate(topic)}>✨ Quick Notes</Button>
              )}
            </div>
          ))}
        </Card>
      ))}
    </div>
  );
}