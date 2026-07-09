/**
 * AdminCharts.jsx
 *
 * Full analytics dashboard for the admin panel.
 * Drop this anywhere inside your admin layout:
 *
 *   import AdminCharts from "./AdminCharts";
 *   <AdminCharts />
 *
 * Fetches from:
 *   GET /api/admin/exams
 *   GET /api/admin/papers?exam_id=
 *   GET /api/admin/weightage/:examId
 *   GET /api/admin/predictions/:examId/:year
 *
 * Chart.js is loaded from CDN via a <script> tag injected once on mount.
 * All chart instances are tracked in a ref so they can be destroyed
 * before re-render (avoids the "canvas already in use" Chart.js error).
 */

import { useState, useEffect, useRef, useCallback } from "react";
import api from "../../../../layout/api";
import "./AdminCharts.css";

// ─────────────────────────────────────────────────────────
//  Colour palette — matches your brand
// ─────────────────────────────────────────────────────────
const PALETTE = [
  "#185FA5", // blue
  "#3B6D11", // green
  "#854F0B", // amber
  "#534AB7", // purple
  "#0F6E56", // teal
  "#993556", // pink
  "#A32D2D", // red
  "#5F5E5A", // gray
];

const color = (i) => PALETTE[i % PALETTE.length];
const alpha = (hex, a) => hex + Math.round(a * 255).toString(16).padStart(2, "0");

// ─────────────────────────────────────────────────────────
//  Load Chart.js from CDN once
// ─────────────────────────────────────────────────────────
let chartJsLoaded = false;
function loadChartJs() {
  return new Promise((resolve) => {
    if (chartJsLoaded || window.Chart) { chartJsLoaded = true; return resolve(); }
    const s   = document.createElement("script");
    s.src     = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
    s.onload  = () => { chartJsLoaded = true; resolve(); };
    document.head.appendChild(s);
  });
}

// ─────────────────────────────────────────────────────────
//  Small helpers
// ─────────────────────────────────────────────────────────
function Legend({ items }) {
  return (
    <div className="ac-legend">
      {items.map(({ label, col }) => (
        <span key={label} className="ac-legend__item">
          <span className="ac-legend__dot" style={{ background: col }} />
          {label}
        </span>
      ))}
    </div>
  );
}

function MetricCard({ label, value, sub }) {
  return (
    <div className="ac-metric">
      <div className="ac-metric__label">{label}</div>
      <div className="ac-metric__value">{value ?? "—"}</div>
      {sub && <div className="ac-metric__sub">{sub}</div>}
    </div>
  );
}

function EmptyState({ icon, text }) {
  return (
    <div className="ac-empty">
      <span className="ac-empty__icon">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

function Spinner() {
  return <div className="ac-spinner" aria-label="Loading" />;
}

function ConfBadge({ score }) {
  const cls =
    score >= 0.7 ? "high" :
    score >= 0.4 ? "mid"  : "low";
  return (
    <span className={`ac-badge ac-badge--${cls}`}>
      {(score * 100).toFixed(0)}%
    </span>
  );
}

// ─────────────────────────────────────────────────────────
//  Chart canvas wrapper  — auto-destroys on re-render
// ─────────────────────────────────────────────────────────
function ChartCanvas({ id, ariaLabel, fallback, height = 300 }) {
  return (
    <div style={{ position: "relative", width: "100%", height }}>
      <canvas id={id} role="img" aria-label={ariaLabel}>{fallback}</canvas>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  Main component
// ─────────────────────────────────────────────────────────
export default function AdminCharts() {
  // ── State ─────────────────────────────────────────────
  const [exams,       setExams]       = useState([]);
  const [examId,      setExamId]      = useState("");
  const [predYear,    setPredYear]    = useState(new Date().getFullYear() + 1);
  const [subjectFilt, setSubjectFilt] = useState("all");

  const [weightage,   setWeightage]   = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [papers,      setPapers]      = useState([]);

  const [activeTab,   setActiveTab]   = useState("weightage");
  const [loading,     setLoading]     = useState({});
  const [errors,      setErrors]      = useState({});

  // Chart instances — keyed by canvas id
  const chartsRef = useRef({});

  // ── Load Chart.js ─────────────────────────────────────
  useEffect(() => { loadChartJs(); }, []);

  // ── Fetch exams on mount ──────────────────────────────
  useEffect(() => {
    api.get("/api/admin/exams")
      .then((r) => {
        setExams(r.data.exams || []);
        if (r.data.exams?.length) setExamId(r.data.exams[0].id);
      })
      .catch(() => setErrors((p) => ({ ...p, exams: "Could not load exams" })));
  }, []);

  // ── Fetch data when exam changes ──────────────────────
  const fetchAll = useCallback(async (id) => {
    if (!id) return;
    setLoading({ weightage: true, papers: true });
    setErrors({});

    const [wRes, pRes] = await Promise.allSettled([
      api.get(`/api/admin/weightage/${id}`),
      api.get(`/api/admin/papers?exam_id=${id}`),
    ]);

    if (wRes.status === "fulfilled") {
      setWeightage(wRes.value.data.weightage || []);
    } else {
      setErrors((p) => ({ ...p, weightage: "Could not load weightage" }));
    }

    if (pRes.status === "fulfilled") {
      setPapers(pRes.value.data.papers || []);
    }

    setLoading({});
  }, []);

  useEffect(() => { fetchAll(examId); }, [examId, fetchAll]);

  // ── Fetch predictions when year or exam changes ───────
  useEffect(() => {
    if (!examId || !predYear) return;
    api.get(`/api/admin/predictions/${examId}/${predYear}`)
      .then((r) => setPredictions(r.data.predictions || []))
      .catch(() => setPredictions([]));
  }, [examId, predYear]);

  // ── Derived data ──────────────────────────────────────
  const subjects = [...new Set(weightage.map((w) => w.subject))].sort();
  const years    = [...new Set(weightage.map((w) => w.year))].sort();

  const filteredW = subjectFilt === "all"
    ? weightage
    : weightage.filter((w) => w.subject === subjectFilt);

  const chapters = [...new Set(filteredW.map((w) => w.chapter))].sort();

  // Chapter totals — for top-N trend chart
  const chapterTotals = {};
  filteredW.forEach((w) => {
    chapterTotals[w.chapter] = (chapterTotals[w.chapter] || 0) + (w.question_count || 0);
  });
  const top8chapters = Object.entries(chapterTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([ch]) => ch);

  // ── Destroy chart helper ──────────────────────────────
  const destroyChart = (id) => {
    if (chartsRef.current[id]) {
      chartsRef.current[id].destroy();
      delete chartsRef.current[id];
    }
  };

  // ── Render weightage stacked bar ──────────────────────
  useEffect(() => {
    if (!window.Chart || activeTab !== "weightage" || !filteredW.length) return;
    destroyChart("ac-weightage");
    const ctx = document.getElementById("ac-weightage");
    if (!ctx) return;

    const top10 = chapters.slice(0, 10);
    const datasets = top10.map((ch, i) => ({
      label: ch,
      data: years.map((y) => {
        const r = filteredW.find((d) => d.chapter === ch && d.year === y);
        return r ? parseFloat(r.weightage_pct).toFixed(1) : 0;
      }),
      backgroundColor: alpha(color(i), 0.82),
      borderColor:     color(i),
      borderWidth: 1,
      borderRadius: 3,
    }));

    chartsRef.current["ac-weightage"] = new window.Chart(ctx, {
      type: "bar",
      data: { labels: years, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { mode: "index" } },
        scales: {
          x: { stacked: true, ticks: { autoSkip: false } },
          y: { stacked: true, title: { display: true, text: "Weightage %" }, beginAtZero: true },
        },
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredW, activeTab]);

  // ── Render trend multi-line ───────────────────────────
  useEffect(() => {
    if (!window.Chart || activeTab !== "trend" || !filteredW.length) return;
    destroyChart("ac-trend");
    const ctx = document.getElementById("ac-trend");
    if (!ctx) return;

    const datasets = top8chapters.map((ch, i) => ({
      label: ch,
      data: years.map((y) => {
        const r = filteredW.find((d) => d.chapter === ch && d.year === y);
        return r ? r.question_count : 0;
      }),
      borderColor:     color(i),
      backgroundColor: alpha(color(i), 0.12),
      tension: 0.35,
      fill: false,
      pointRadius: 4,
      pointHoverRadius: 6,
      borderDash: i % 2 === 1 ? [5, 3] : [],
    }));

    chartsRef.current["ac-trend"] = new window.Chart(ctx, {
      type: "line",
      data: { labels: years, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { autoSkip: false } },
          y: { title: { display: true, text: "Questions" }, beginAtZero: true },
        },
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredW, activeTab]);

  // ── Render predictions horizontal bar ─────────────────
  useEffect(() => {
    if (!window.Chart || activeTab !== "predictions" || !predictions.length) return;
    destroyChart("ac-pred");
    const ctx = document.getElementById("ac-pred");
    if (!ctx) return;

    const top12 = predictions.slice(0, 12);
    chartsRef.current["ac-pred"] = new window.Chart(ctx, {
      type: "bar",
      data: {
        labels: top12.map((p) => p.chapter),
        datasets: [
          {
            label: "Predicted weightage %",
            data: top12.map((p) => parseFloat(p.predicted_weightage).toFixed(2)),
            backgroundColor: alpha("#185FA5", 0.82),
            borderColor: "#185FA5",
            borderWidth: 1,
            borderRadius: 3,
            yAxisID: "y",
          },
          {
            label: "Predicted questions",
            data: top12.map((p) => parseFloat(p.predicted_q_count).toFixed(1)),
            backgroundColor: alpha("#3B6D11", 0.6),
            borderColor: "#3B6D11",
            borderWidth: 1,
            borderRadius: 3,
            yAxisID: "y2",
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x:  { beginAtZero: true, title: { display: true, text: "Weightage %" } },
          y2: {
            beginAtZero: true,
            position: "right",
            title: { display: true, text: "Questions" },
            grid: { drawOnChartArea: false },
          },
        },
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [predictions, activeTab]);

  // ── Render notes donut (subject distribution) ─────────
  useEffect(() => {
    if (!window.Chart || activeTab !== "notes" || !weightage.length) return;
    destroyChart("ac-notes-donut");
    const ctx = document.getElementById("ac-notes-donut");
    if (!ctx) return;

    // Aggregate total questions per subject across all years
    const subjectTotals = {};
    weightage.forEach((w) => {
      subjectTotals[w.subject] = (subjectTotals[w.subject] || 0) + (w.question_count || 0);
    });
    const subjectEntries = Object.entries(subjectTotals).sort((a, b) => b[1] - a[1]);
    const total = subjectEntries.reduce((s, [, v]) => s + v, 0);

    chartsRef.current["ac-notes-donut"] = new window.Chart(ctx, {
      type: "doughnut",
      data: {
        labels: subjectEntries.map(([s]) => s),
        datasets: [{
          data: subjectEntries.map(([, v]) => v),
          backgroundColor: subjectEntries.map((_, i) => color(i)),
          borderWidth: 2,
          borderColor: "#fff",
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "62%",
        plugins: { legend: { display: false } },
      },
    });

    // Notes coverage bar
    destroyChart("ac-notes-bar");
    const ctx2 = document.getElementById("ac-notes-bar");
    if (!ctx2) return;

    // Questions per year (total across all chapters)
    const yearTotals = {};
    weightage.forEach((w) => {
      yearTotals[w.year] = (yearTotals[w.year] || 0) + (w.question_count || 0);
    });
    const sortedYears = Object.keys(yearTotals).sort();

    chartsRef.current["ac-notes-bar"] = new window.Chart(ctx2, {
      type: "bar",
      data: {
        labels: sortedYears,
        datasets: [{
          label: "Total questions",
          data: sortedYears.map((y) => yearTotals[y]),
          backgroundColor: sortedYears.map((_, i) => alpha(color(i), 0.75)),
          borderColor:     sortedYears.map((_, i) => color(i)),
          borderWidth: 1,
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { autoSkip: false } },
          y: { beginAtZero: true, title: { display: true, text: "Questions" } },
        },
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weightage, activeTab]);

  // ── Cleanup all charts on unmount ─────────────────────
  useEffect(() => {
    return () => Object.values(chartsRef.current).forEach((c) => c.destroy());
  }, []);

  // ── Metric calculations ───────────────────────────────
  const processedPapers = papers.filter((p) => p.processed).length;
  const totalQ = weightage.reduce((s, w) => s + (w.question_count || 0), 0);
  const avgWeightage = predictions.length
    ? (predictions.reduce((s, p) => s + (p.predicted_weightage || 0), 0) / predictions.length).toFixed(1)
    : null;

  const TABS = [
    { id: "weightage",   label: "Weightage history" },
    { id: "trend",       label: "Question trends"   },
    { id: "predictions", label: "ML predictions"    },
    { id: "notes",       label: "Notes overview"    },
    { id: "papers",      label: "Papers"            },
  ];

  return (
    <div className="ac-root">

      {/* ── Controls bar ── */}
      <div className="ac-controls">
        <div className="ac-controls__left">
          <select
            className="ac-select"
            value={examId}
            onChange={(e) => setExamId(e.target.value)}
          >
            {exams.length === 0 && <option>No exams yet</option>}
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>{ex.name}</option>
            ))}
          </select>

          <select
            className="ac-select"
            value={subjectFilt}
            onChange={(e) => setSubjectFilt(e.target.value)}
          >
            <option value="all">All subjects</option>
            {subjects.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="ac-controls__right">
          <label className="ac-controls__label">Prediction year</label>
          <input
            className="ac-input"
            type="number"
            min={2024}
            max={2035}
            value={predYear}
            onChange={(e) => setPredYear(parseInt(e.target.value))}
            style={{ width: 90 }}
          />
        </div>
      </div>

      {/* ── Metrics row ── */}
      <div className="ac-metrics">
        <MetricCard
          label="Papers uploaded"
          value={papers.length}
          sub={`${processedPapers} processed`}
        />
        <MetricCard
          label="Years of data"
          value={years.length}
          sub={years.length ? `${years[0]}–${years[years.length - 1]}` : null}
        />
        <MetricCard
          label="Chapters tracked"
          value={chapters.length}
          sub={`${subjects.length} subjects`}
        />
        <MetricCard
          label="Total questions"
          value={totalQ.toLocaleString()}
          sub="across all years"
        />
        <MetricCard
          label="Avg predicted wt."
          value={avgWeightage ? `${avgWeightage}%` : null}
          sub={`for ${predYear}`}
        />
      </div>

      {/* ── Tabs ── */}
      <div className="ac-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`ac-tab ${activeTab === t.id ? "ac-tab--active" : ""}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════
           WEIGHTAGE TAB
          ══════════════════════════════ */}
      {activeTab === "weightage" && (
        <div className="ac-panel">
          <div className="ac-panel__head">
            Chapter weightage % by year — stacked
          </div>
          {loading.weightage ? (
            <Spinner />
          ) : !filteredW.length ? (
            <EmptyState icon="📊" text="No weightage data. Upload and process a paper first." />
          ) : (
            <>
              <Legend items={chapters.slice(0, 10).map((ch, i) => ({ label: ch, col: color(i) }))} />
              <ChartCanvas
                id="ac-weightage"
                ariaLabel={`Stacked bar chart of chapter weightage percentages from ${years[0]} to ${years[years.length - 1]}`}
                fallback="Chapter weightage data across years."
                height={380}
              />
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════
           TREND TAB
          ══════════════════════════════ */}
      {activeTab === "trend" && (
        <div className="ac-panel">
          <div className="ac-panel__head">
            Question count per chapter — top 8 by total
          </div>
          {loading.weightage ? (
            <Spinner />
          ) : !filteredW.length ? (
            <EmptyState icon="📈" text="No trend data yet." />
          ) : (
            <>
              <Legend items={top8chapters.map((ch, i) => ({ label: ch, col: color(i) }))} />
              <ChartCanvas
                id="ac-trend"
                ariaLabel="Multi-line chart of question counts per chapter across years"
                fallback="Question count trends per chapter."
                height={360}
              />
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════
           PREDICTIONS TAB
          ══════════════════════════════ */}
      {activeTab === "predictions" && (
        <div className="ac-panel">
          <div className="ac-panel__head">
            ML predicted weightage for {predYear}
            {predictions[0]?.model_version && (
              <span className="ac-panel__meta">model: {predictions[0].model_version}</span>
            )}
          </div>
          {!predictions.length ? (
            <EmptyState icon="🤖" text={`No predictions for ${predYear}. Run the ML model from the Upload → ML Model tab.`} />
          ) : (
            <>
              <Legend items={[
                { label: "Predicted weightage %", col: "#185FA5" },
                { label: "Predicted questions",   col: "#3B6D11" },
              ]} />
              <ChartCanvas
                id="ac-pred"
                ariaLabel={`Horizontal bar chart of predicted chapter weightage for ${predYear}`}
                fallback="Predicted weightage per chapter."
                height={Math.max(300, predictions.slice(0, 12).length * 38 + 80)}
              />

              {/* Predictions table */}
              <div className="ac-table-wrap">
                <table className="ac-table">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Chapter</th>
                      <th>Pred. questions</th>
                      <th>Pred. marks</th>
                      <th>Pred. weightage %</th>
                      <th>Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {predictions.map((p, i) => (
                      <tr key={i}>
                        <td>{p.subject}</td>
                        <td>{p.chapter}</td>
                        <td>{parseFloat(p.predicted_q_count).toFixed(1)}</td>
                        <td>{parseFloat(p.predicted_marks).toFixed(1)}</td>
                        <td>{parseFloat(p.predicted_weightage).toFixed(2)}</td>
                        <td><ConfBadge score={p.confidence_score} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════
           NOTES OVERVIEW TAB
          ══════════════════════════════ */}
      {activeTab === "notes" && (
        <div className="ac-panel">
          {!weightage.length ? (
            <EmptyState icon="📝" text="No notes data yet. Upload and process papers first." />
          ) : (
            <>
              {/* Subject distribution donut */}
              <div className="ac-panel__head">Question distribution by subject</div>
              <div className="ac-two-col">
                <div>
                  <Legend items={
                    [...new Set(weightage.map((w) => w.subject))]
                      .sort()
                      .map((s, i) => ({ label: s, col: color(i) }))
                  } />
                  <ChartCanvas
                    id="ac-notes-donut"
                    ariaLabel="Donut chart showing question distribution across subjects"
                    fallback="Subject distribution."
                    height={240}
                  />
                </div>

                {/* Chapter coverage table — top 10 chapters by total questions */}
                <div className="ac-coverage">
                  <div className="ac-coverage__head">Top chapters by question volume</div>
                  {Object.entries(chapterTotals)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10)
                    .map(([ch, total], i) => {
                      const maxVal = Object.values(chapterTotals).reduce((a, b) => Math.max(a, b), 1);
                      const pct    = Math.round((total / maxVal) * 100);
                      return (
                        <div key={ch} className="ac-coverage__row">
                          <span className="ac-coverage__name">{ch}</span>
                          <div className="ac-coverage__bar-wrap">
                            <div
                              className="ac-coverage__bar"
                              style={{ width: `${pct}%`, background: color(i) }}
                            />
                          </div>
                          <span className="ac-coverage__count">{total}</span>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Total questions per year bar */}
              <div className="ac-panel__head" style={{ marginTop: "1.5rem" }}>
                Total questions per year
              </div>
              <ChartCanvas
                id="ac-notes-bar"
                ariaLabel="Bar chart of total question count per exam year"
                fallback="Questions per year."
                height={240}
              />
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════
           PAPERS TAB
          ══════════════════════════════ */}
      {activeTab === "papers" && (
        <div className="ac-panel">
          <div className="ac-panel__head">
            Uploaded question papers
            <span className="ac-panel__meta">{papers.length} total</span>
          </div>
          {loading.papers ? (
            <Spinner />
          ) : !papers.length ? (
            <EmptyState icon="📄" text="No papers uploaded yet." />
          ) : (
            <div className="ac-table-wrap">
              <table className="ac-table">
                <thead>
                  <tr>
                    <th>Year</th>
                    <th>Exam</th>
                    <th>Status</th>
                    <th>Uploaded</th>
                  </tr>
                </thead>
                <tbody>
                  {papers.map((p, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 500 }}>{p.year}</td>
                      <td>{p.exam_name}</td>
                      <td>
                        {p.processed
                          ? <span className="ac-badge ac-badge--high">Processed</span>
                          : <span className="ac-badge ac-badge--low">Pending</span>
                        }
                      </td>
                      <td style={{ color: "var(--color-text-secondary, #666)", fontSize: 12 }}>
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}