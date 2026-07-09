/**
 * components/charts/ChapterStatsPanel.jsx — v4
 *
 * Reads directly from note.weightageSnapshot and note.prediction.
 * NO API call. NO useChapterStats hook. Data is already on the
 * note document — written by notes.service.js → fetchExamContext()
 * at note generation time.
 *
 * Fix (v4): note.weightageSnapshot is NOT guaranteed to be in
 * chronological order (it reflects paper ingestion order, not exam
 * year order). Previously, `history` was used unsorted everywhere
 * except inside the chart-building useEffect, which sorted into a
 * separate local `sortedHistory` variable that was never propagated
 * back. That meant lastRow / prevRow / nextYear / trend could read
 * the wrong row (e.g. "predicted year 2016" when the actual next
 * year should have been 2027), even though the chart itself looked
 * fine. `history` is now sorted once, immediately after being pulled
 * off the note, and every derived value below uses that same sorted
 * array — so the header badge, metric strip, prediction card, and
 * chart can never disagree.
 *
 * Props:
 *   note       — the full note object from MongoDB (required)
 *   isAdmin    — show extra ML metadata (default: false)
 *
 * note fields consumed:
 *   note.exam               → header badge
 *   note.subject            → header badge
 *   note.chapter             → header title
 *   note.weightageSnapshot  → [ { year, question_count, total_marks, weightage_pct } ]
 *   note.prediction         → { predicted_q_count, predicted_marks,
 *                               predicted_weightage, confidence_score } | null
 */

import { useState, useEffect, useRef } from "react";
import "./Chapterstatspanel.css";

// ── Chart.js CDN loader (called once) ─────────────────
let _cjsReady = false;
function ensureChartJs() {
  return new Promise((resolve) => {
    if (_cjsReady || window.Chart) { _cjsReady = true; return resolve(); }
    const s  = document.createElement("script");
    s.src    = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
    s.onload = () => { _cjsReady = true; resolve(); };
    document.head.appendChild(s);
  });
}

// ── UI atoms ──────────────────────────────────────────
function Metric({ label, value, accent }) {
  return (
    <div className="csp-metric">
      <span className="csp-metric__val" style={accent ? { color: accent } : {}}>
        {value ?? "—"}
      </span>
      <span className="csp-metric__lbl">{label}</span>
    </div>
  );
}

function ConfBar({ score }) {
  const pct = Math.round((score || 0) * 100);
  const col  = pct >= 70 ? "#3B6D11" : pct >= 40 ? "#854F0B" : "#A32D2D";
  return (
    <div className="csp-conf">
      <div className="csp-conf__track">
        <div className="csp-conf__fill" style={{ width: `${pct}%`, background: col }} />
      </div>
      <span className="csp-conf__label" style={{ color: col }}>{pct}% confidence</span>
    </div>
  );
}

function ChartCanvas({ id, label, height = 220 }) {
  return (
    <div style={{ position: "relative", width: "100%", height }}>
      <canvas id={id} role="img" aria-label={label} />
    </div>
  );
}

// ── Confidence band plugin ────────────────────────────
function makeConfidenceBandPlugin(predIndex, confidenceScore) {
  return {
    id: `csp-band-${predIndex}`,
    beforeDraw(chart) {
      if (predIndex == null || !confidenceScore) return;
      const { ctx, chartArea, scales } = chart;
      if (!chartArea || !scales.x) return;
      const meta  = chart.getDatasetMeta(0);
      const barEl = meta?.data?.[predIndex];
      if (!barEl) return;
      const bw     = barEl.width * 2.2;
      const bx     = barEl.x - bw / 2;
      const bandH  = chartArea.height * Math.min(confidenceScore, 1);
      const bottom = chartArea.bottom;
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle   = "#854F0B";
      ctx.fillRect(bx, bottom - bandH, bw, bandH);
      ctx.globalAlpha = 1;
      ctx.restore();
    },
  };
}

// ─────────────────────────────────────────────────────
//  Main component
// ─────────────────────────────────────────────────────
export default function ChapterStatsPanel({ note, isAdmin = false }) {
  const chartRef  = useRef({});
  const [ready, setReady] = useState(false);

  useEffect(() => { ensureChartJs().then(() => setReady(true)); }, []);

  // Pull data directly off the note — no fetch needed.
  // IMPORTANT: weightageSnapshot reflects paper ingestion order, NOT
  // chronological exam-year order, so it must be sorted before anything
  // downstream (lastRow, prevRow, nextYear, the chart, etc.) reads it.
  const rawHistory = note?.weightageSnapshot || [];
  const history     = [...rawHistory].sort((a, b) => a.year - b.year);
  const pred        = note?.prediction        || null;
  const chapter     = note?.chapter           || "";
  const subject     = note?.subject           || "";
  const exam        = note?.exam              || "";

  // ── Derived metrics (all read from the sorted `history`) ─────
  const totalQ   = history.reduce((s, r) => s + (r.question_count || 0), 0);
  const avgQ     = history.length ? (totalQ / history.length).toFixed(1) : null;
  const lastRow  = history[history.length - 1];
  const prevRow  = history[history.length - 2];
  const trend    =
    lastRow && prevRow
      ? lastRow.question_count - prevRow.question_count
      : null;
  const trendLabel =
    trend === null ? "—"
    : trend > 0    ? `↑ +${trend}`
    : trend < 0    ? `↓ ${trend}`
    :                "→ same";
  const trendColor =
    trend > 0 ? "#3B6D11" : trend < 0 ? "#A32D2D" : "#854F0B";

  // Single source of truth for "what year is the prediction for" —
  // used by the header badge, the metric strip, the prediction card,
  // and the chart, so they can never disagree with each other.
  const nextYear = lastRow ? lastRow.year + 1 : new Date().getFullYear() + 1;

  // ── Build combined forecast chart ───────────────────
  useEffect(() => {
    if (!ready || !history.length) return;

    // Destroy previous instance
    if (chartRef.current.instance) {
      chartRef.current.instance.destroy();
      chartRef.current.instance = null;
    }

    const ctx = document.getElementById(`csp-forecast-${note._id}`);
    if (!ctx) return;

    // `history` is already sorted above — no need to re-sort here.
    const labels     = history.map((r) => String(r.year));
    const qCounts    = history.map((r) => r.question_count || 0);
    const weightages = history.map((r) =>
      parseFloat(r.weightage_pct || 0)
    );

    const barBg     = qCounts.map(() => "#185FA5CC");
    const barBorder = qCounts.map(() => "#185FA5");

    let predIndex = null;
    if (pred?.predicted_q_count != null) {
      predIndex = labels.length;
      labels.push(`${nextYear} ★`);
      qCounts.push(parseFloat(pred.predicted_q_count));
      weightages.push(parseFloat(pred.predicted_weightage || 0));
      barBg.push("#854F0B55");
      barBorder.push("#854F0B");
    }

    chartRef.current.instance = new window.Chart(ctx, {
      type: "bar",
      plugins: [makeConfidenceBandPlugin(predIndex, pred?.confidence_score)],
      data: {
        labels,
        datasets: [
          {
            type:            "bar",
            label:           "Questions",
            data:            qCounts,
            backgroundColor: barBg,
            borderColor:     barBorder,
            borderWidth:     1.5,
            borderRadius:    4,
            yAxisID:         "yQ",
            order:           2,
          },
          {
            type:            "line",
            label:           "Weightage %",
            data:            weightages,
            borderColor:     "#534AB7",
            backgroundColor: "#534AB710",
            pointBackgroundColor: weightages.map((_, i) =>
              i === predIndex ? "#854F0B" : "#534AB7"
            ),
            pointRadius:  weightages.map((_, i) => i === predIndex ? 6 : 4),
            pointStyle:   weightages.map((_, i) =>
              i === predIndex ? "star" : "circle"
            ),
            tension:      0.35,
            fill:         false,
            borderWidth:  2,
            segment: {
              borderDash:  (c) => c.p1DataIndex === predIndex ? [5, 4] : [],
              borderColor: (c) =>
                c.p1DataIndex === predIndex ? "#854F0B" : "#534AB7",
            },
            yAxisID: "yW",
            order:   1,
          },
        ],
      },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => {
                const lbl = items[0]?.label || "";
                return lbl.includes("★")
                  ? `${lbl.replace(" ★", "")} — ML prediction`
                  : lbl;
              },
              afterLabel: (item) => {
                if (item.datasetIndex === 0 && item.dataIndex === predIndex) {
                  const conf = Math.round((pred?.confidence_score || 0) * 100);
                  return `Confidence: ${conf}%`;
                }
                return "";
              },
            },
          },
        },
        scales: {
          x: {
            ticks: {
              autoSkip: false,
              font: { size: 11 },
              color: (c) => c.index === predIndex ? "#854F0B" : undefined,
            },
            grid: { display: false },
          },
          yQ: {
            type:        "linear",
            position:    "left",
            beginAtZero: true,
            title:       { display: true, text: "Questions", font: { size: 11 } },
            ticks:       { stepSize: 1, font: { size: 10 } },
            grid:        { color: "rgba(0,0,0,0.05)" },
          },
          yW: {
            type:        "linear",
            position:    "right",
            beginAtZero: true,
            title:       { display: true, text: "Weightage %", font: { size: 11 } },
            ticks:       { callback: (v) => `${v}%`, font: { size: 10 } },
            grid:        { drawOnChartArea: false },
          },
        },
      },
    });
  }, [ready, note._id, history, pred, nextYear]);

  // Destroy on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current.instance) {
        chartRef.current.instance.destroy();
      }
    };
  }, []);

  // Don't render the panel at all if no weightage data was snapshotted
  if (!history.length && !pred) return null;

  return (
    <div className="csp-root">

      {/* Header */}
      <div className="csp-header">
        <div className="csp-header__left">
          <span className="csp-header__label">Exam analytics</span>
          <span className="csp-header__chapter">{chapter}</span>
          {subject && <span className="csp-header__subject">{subject}</span>}
        </div>
        <div className="csp-header__right">
          {exam && (
            <span className="csp-header__exam">{exam}</span>
          )}
          {pred && (
            <span className="csp-header__pred-badge">
              ★ {nextYear} predicted
            </span>
          )}
        </div>
      </div>

      {/* Only show "no data" message if explicitly empty after mount */}
      {!history.length ? (
        <div className="csp-empty">
          No historical data available for this chapter yet.
        </div>
      ) : (
        <>
          {/* Metric strip */}
          <div className="csp-metrics">
            <Metric label="Total Qs"      value={totalQ} />
            <Metric label="Years of data" value={history.length} />
            <Metric label="Avg / year"    value={avgQ} />
            <Metric
              label={lastRow?.year ?? "Last year"}
              value={`${lastRow?.question_count ?? "—"}Q`}
            />
            <Metric
              label="vs prev"
              value={trendLabel}
              accent={trendColor}
            />
            {pred?.predicted_q_count != null && (
              <Metric
                label={`${nextYear} pred.`}
                value={`~${parseFloat(pred.predicted_q_count).toFixed(0)}Q`}
                accent="#854F0B"
              />
            )}
          </div>

          {/* Legend */}
          <div className="csp-legend">
            <span className="csp-legend__item">
              <span className="csp-legend__dot" style={{ background: "#185FA5" }} />
              Questions (past)
            </span>
            {pred && (
              <span className="csp-legend__item">
                <span
                  className="csp-legend__dot"
                  style={{ background: "#854F0B", opacity: 0.7 }}
                />
                Questions (predicted)
              </span>
            )}
            <span className="csp-legend__item">
              <span
                className="csp-legend__dot"
                style={{
                  background:   "#534AB7",
                  borderRadius: 0,
                  height:       2,
                  width:        14,
                  marginTop:    3,
                }}
              />
              Weightage %
            </span>
          </div>

          {/* Forecast chart — canvas id scoped to note._id */}
          <div className="csp-section">
            <ChartCanvas
              id={`csp-forecast-${note._id}`}
              label={`Question history and ML prediction for ${chapter}`}
              height={220}
            />
          </div>

          {/* Prediction detail card */}
          {pred ? (
            <div className="csp-pred">
              <div className="csp-pred__header">
                <span className="csp-pred__year">
                  ML prediction — {nextYear}
                </span>
              </div>
              <div className="csp-pred__row">
                <div className="csp-pred__stat">
                  <span className="csp-pred__num">
                    {parseFloat(pred.predicted_q_count).toFixed(1)}
                  </span>
                  <span className="csp-pred__lbl">questions</span>
                </div>
                <div className="csp-pred__stat">
                  <span className="csp-pred__num">
                    {parseFloat(pred.predicted_weightage).toFixed(1)}%
                  </span>
                  <span className="csp-pred__lbl">weightage</span>
                </div>
                <div className="csp-pred__stat">
                  <span className="csp-pred__num">
                    {parseFloat(pred.predicted_marks).toFixed(1)}
                  </span>
                  <span className="csp-pred__lbl">marks</span>
                </div>
              </div>
              <ConfBar score={pred.confidence_score} />
            </div>
          ) : (
            <div className="csp-pred csp-pred--empty">
              No ML prediction available yet for this chapter.
            </div>
          )}
        </>
      )}
    </div>
  );
}