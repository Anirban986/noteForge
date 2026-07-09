/**
 * components/charts/WeightageSparkline.jsx — v3
 *
 * Reads directly from note.weightageSnapshot and note.prediction.
 * NO API call — data is already embedded on the note document
 * by notes.service.js at generation time via fetchExamContext().
 *
 * Props:
 *   history    — note.weightageSnapshot  (array of { year, question_count, ... })
 *   prediction — note.prediction         ({ predicted_q_count, ... } | null)
 *   chapter    — note.chapter            (for tooltip title only)
 *   exam       — note.exam               (for tooltip title only)
 */

import "./Chapterstatspanel.css";

// ── Pure SVG sparkline helpers ─────────────────────────
function buildPoints(history, w = 80, h = 28) {
  if (!history?.length) return "";
  const counts = history.map((r) => r.question_count || 0);
  const minV   = Math.min(...counts);
  const maxV   = Math.max(...counts);
  const range  = maxV - minV || 1;
  const step   = counts.length > 1 ? w / (counts.length - 1) : w / 2;
  return counts
    .map((v, i) => {
      const x = i * step;
      const y = h - ((v - minV) / range) * (h - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function getTrend(history) {
  if (!history || history.length < 2) return "neutral";
  const last = history[history.length - 1]?.question_count || 0;
  const prev = history[history.length - 2]?.question_count || 0;
  if (last > prev) return "up";
  if (last < prev) return "down";
  return "neutral";
}

const ARROWS = { up: "↑", down: "↓", neutral: "→" };

export default function WeightageSparkline({ history, prediction, chapter, exam }) {
  // Nothing to show — note has no weightage data yet
  // (happens when papers haven't been uploaded for this exam yet)
  if (!history?.length) return null;

  const points   = buildPoints(history);
  const lastRow  = history[history.length - 1];
  const trend    = getTrend(history);
  const arrow    = ARROWS[trend];
  const gradId   = `wsp-${(chapter || "x").replace(/\W/g, "").slice(0, 12)}`;

  return (
    <div
      className="wsp"
      title={`${chapter || "Chapter"} · ${exam || ""} — question history`}
    >
      {/* SVG sparkline */}
      <svg
        width="80"
        height="28"
        viewBox="0 0 80 28"
        aria-hidden="true"
        className="wsp__svg"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#185FA5" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#185FA5" stopOpacity="0"    />
          </linearGradient>
        </defs>
        {points && (
          <>
            <polyline
              points={`0,28 ${points} 80,28`}
              fill={`url(#${gradId})`}
              stroke="none"
            />
            <polyline
              points={points}
              fill="none"
              stroke="#185FA5"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}
      </svg>

      {/* Inline stats */}
      <div className="wsp__stats">
        <span className="wsp__count">
          {lastRow.question_count}Q · {lastRow.year}
        </span>
        <span className={`wsp__arrow wsp__arrow--${trend}`}>{arrow}</span>
        {prediction?.predicted_q_count != null && (
          <span className="wsp__pred">
            ~{Math.round(prediction.predicted_q_count)}Q predicted
          </span>
        )}
      </div>
    </div>
  );
}