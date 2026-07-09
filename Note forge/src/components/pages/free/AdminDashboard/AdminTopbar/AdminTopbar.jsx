import { useState, useEffect, useRef } from "react";
import api from "../../../../layout/api";
import {
  getExamNames,
  getSubjects,
  getChapters,
  getSectionLabel,
} from "../../../exam/ExamData";
import "./AdminTopbar.css";

// ─────────────────────────────────────────────────────────
//  Upload Modal  (tabs: paper | syllabus | ml)
// ─────────────────────────────────────────────────────────

function UploadModal({ onClose }) {
  const [tab, setTab]           = useState("paper");
  const [examName, setExamName] = useState("");
  const [subject, setSubject]   = useState("");
  const [chapter, setChapter]   = useState("");
  const [year, setYear]         = useState(new Date().getFullYear());
  const [file, setFile]         = useState(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus]     = useState("idle");   // idle|loading|success|error
  const [message, setMessage]   = useState("");

  // ML-tab state
  const [mlExamId, setMlExamId]           = useState("");
  const [mlExams, setMlExams]             = useState([]);
  const [mlPredictYear, setMlPredictYear] = useState(new Date().getFullYear() + 1);
  const [mlAction, setMlAction]           = useState("train"); // "train"|"predict"|"both"
  const [mlStatus, setMlStatus]           = useState("idle");  // idle|running|done|error
  const [mlLog, setMlLog]                 = useState("");

  const fileInputRef = useRef(null);

  const examNames = getExamNames();
  const subjects  = examName ? getSubjects(examName) : [];
  const chapters  = examName && subject ? getChapters(examName, subject) : [];

  useEffect(() => { setSubject(""); setChapter(""); }, [examName]);
  useEffect(() => { setChapter(""); }, [subject]);

  // Escape key to close
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  // Fetch exams for ML tab when it becomes active
  useEffect(() => {
    if (tab !== "ml") return;
    api.get("/api/admin/exams")
      .then((res) => setMlExams(res.data.exams || []))
      .catch(() => setMlExams([]));
  }, [tab]);

  // ── Drag handlers ──────────────────────────────────────
  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === "application/pdf") {
      setFile(dropped);
      setMessage("");
    } else {
      setMessage("Only PDF files are accepted.");
    }
  };

  const handleFileChange = (e) => {
    const picked = e.target.files[0];
    if (picked) { setFile(picked); setMessage(""); }
  };

  // ── File upload submit ─────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file)     return setMessage("Please select a PDF file.");
    if (!examName) return setMessage("Please select an exam.");
    if (tab === "paper" && (!year || year < 1990 || year > 2100))
      return setMessage("Enter a valid year (1990–2100).");

    setStatus("loading");
    setMessage("");

    const formData = new FormData();
    formData.append("file",      file);
    formData.append("exam_name", examName);
    if (tab === "paper") {
      formData.append("year", year);
      if (subject) formData.append("subject", subject);
      if (chapter) formData.append("chapter", chapter);
    }

    const endpoint =
      tab === "paper"
        ? "/api/admin/papers/upload"
        : "/api/admin/syllabus/upload";

    try {
      const res = await api.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000,
      });
      setStatus("success");
      setMessage(
        tab === "paper"
          ? "Paper accepted. OCR and question mapping running in background."
          : `Syllabus uploaded — ${res.data.subjects_created ?? "—"} subjects, ${res.data.chapters_created ?? "—"} chapters parsed.`
      );
    } catch (err) {
      setStatus("error");
      setMessage(err.response?.data?.error || "Upload failed. Please try again.");
    }
  };

  // ── ML actions ─────────────────────────────────────────
  const handleMlRun = async () => {
    if (!mlExamId) return setMlLog("Select an exam first.");
    setMlStatus("running");
    setMlLog("");

    try {
      if (mlAction === "train" || mlAction === "both") {
        setMlLog((prev) => prev + "Training model…\n");
        const res = await api.post("/api/admin/ml/train", { exam_id: mlExamId });
        const d   = res.data;
        setMlLog((prev) =>
          prev +
          `✓ Training complete — ${d.train_samples ?? "?"} samples, ` +
          `${d.chapters ?? "?"} chapters\n` +
          (d.cv_results
            ? Object.entries(d.cv_results)
                .map(([k, v]) => `  ${k}: MAE ${v.mae} ± ${v.std}`)
                .join("\n") + "\n"
            : "")
        );
      }

      if (mlAction === "predict" || mlAction === "both") {
        setMlLog((prev) => prev + `Predicting for ${mlPredictYear}…\n`);
        const res = await api.post("/api/admin/ml/predict", {
          exam_id:      mlExamId,
          predict_year: parseInt(mlPredictYear),
        });
        setMlLog((prev) =>
          prev + `✓ ${res.data.count} chapter predictions saved for ${mlPredictYear}\n`
        );
      }

      setMlStatus("done");
    } catch (err) {
      setMlStatus("error");
      setMlLog((prev) =>
        prev + `✗ Error: ${err.response?.data?.error || err.message}\n`
      );
    }
  };

  const reset = () => {
    setFile(null);
    setStatus("idle");
    setMessage("");
    setExamName("");
    setSubject("");
    setChapter("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const switchTab = (t) => { setTab(t); reset(); setMlLog(""); setMlStatus("idle"); };

  const currentYear = new Date().getFullYear();

  return (
    <div
      className="upm-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="upm-modal">

        {/* ── Header ── */}
        <div className="upm-header">
          <div className="upm-header__left">
            <span className="upm-header__icon">⬆</span>
            <div>
              <div className="upm-header__title">Upload to NoteForge</div>
              <div className="upm-header__sub">Admin · Secure upload</div>
            </div>
          </div>
          <button className="upm-close" onClick={onClose}>✕</button>
        </div>

        {/* ── Tabs ── */}
        <div className="upm-tabs">
          <button
            className={`upm-tab ${tab === "paper" ? "upm-tab--active" : ""}`}
            onClick={() => switchTab("paper")}
          >
            <span className="upm-tab__icon">📄</span>
            Question Paper
          </button>
          <button
            className={`upm-tab ${tab === "syllabus" ? "upm-tab--active" : ""}`}
            onClick={() => switchTab("syllabus")}
          >
            <span className="upm-tab__icon">📋</span>
            Syllabus
          </button>
          <button
            className={`upm-tab ${tab === "ml" ? "upm-tab--active" : ""}`}
            onClick={() => switchTab("ml")}
          >
            <span className="upm-tab__icon">🤖</span>
            ML Model
          </button>
        </div>

        {/* ══════════════════════════════
             ML TAB
            ══════════════════════════════ */}
        {tab === "ml" && (
          <div className="upm-form">

            {/* Exam picker */}
            <div className="upm-field">
              <label className="upm-label">Exam</label>
              <div className="upm-select-wrap">
                <select
                  className="upm-select"
                  value={mlExamId}
                  onChange={(e) => setMlExamId(e.target.value)}
                >
                  <option value="">Select exam…</option>
                  {mlExams.map((ex) => (
                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                  ))}
                </select>
              </div>
              <span className="upm-field__hint">
                Exams are created automatically when you upload a paper
              </span>
            </div>

            {/* Action picker */}
            <div className="upm-field">
              <label className="upm-label">Action</label>
              <div className="upm-ml-actions">
                {[
                  { value: "train",   label: "Train only",        hint: "Re-train model on all uploaded papers" },
                  { value: "predict", label: "Predict only",       hint: "Generate predictions (model must already be trained)" },
                  { value: "both",    label: "Train then predict", hint: "Full pipeline — recommended after uploading a new paper" },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`upm-ml-opt ${mlAction === opt.value ? "upm-ml-opt--active" : ""}`}
                  >
                    <input
                      type="radio"
                      name="mlAction"
                      value={opt.value}
                      checked={mlAction === opt.value}
                      onChange={() => setMlAction(opt.value)}
                      style={{ display: "none" }}
                    />
                    <span className="upm-ml-opt__label">{opt.label}</span>
                    <span className="upm-ml-opt__hint">{opt.hint}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Predict year — only shown when predict is involved */}
            {(mlAction === "predict" || mlAction === "both") && (
              <div className="upm-field">
                <label className="upm-label">Prediction year</label>
                <input
                  className="upm-input"
                  type="number"
                  min={currentYear}
                  max={currentYear + 5}
                  value={mlPredictYear}
                  onChange={(e) => setMlPredictYear(parseInt(e.target.value))}
                />
                <span className="upm-field__hint">
                  Year to predict question weightage for
                </span>
              </div>
            )}

            {/* Log output */}
            {mlLog && (
              <div className={`upm-ml-log ${mlStatus === "error" ? "upm-ml-log--error" : mlStatus === "done" ? "upm-ml-log--done" : ""}`}>
                <pre>{mlLog}</pre>
              </div>
            )}

            {/* Actions */}
            <div className="upm-actions">
              <button
                type="button"
                className="upm-btn upm-btn--ghost"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="button"
                className="upm-btn upm-btn--primary"
                disabled={!mlExamId || mlStatus === "running"}
                onClick={handleMlRun}
              >
                {mlStatus === "running" ? (
                  <><span className="upm-btn__spinner" /> Running…</>
                ) : (
                  mlAction === "train" ? "Train model" :
                  mlAction === "predict" ? "Run predictions" :
                  "Train & predict"
                )}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════
             PAPER / SYLLABUS TABS
            ══════════════════════════════ */}
        {tab !== "ml" && (
          <>
            {status !== "success" ? (
              <form className="upm-form" onSubmit={handleSubmit}>

                {/* Exam dropdown */}
                <div className="upm-field">
                  <label className="upm-label">Exam</label>
                  <div className="upm-select-wrap">
                    <select
                      className="upm-select"
                      value={examName}
                      onChange={(e) => setExamName(e.target.value)}
                      required
                    >
                      <option value="" disabled>Select exam…</option>
                      {examNames.map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Paper-only fields */}
                {tab === "paper" && (
                  <>
                    <div className="upm-field">
                      <label className="upm-label">Year</label>
                      <input
                        className="upm-input"
                        type="number"
                        min={1990}
                        max={2100}
                        value={year}
                        onChange={(e) => setYear(parseInt(e.target.value))}
                        required
                      />
                      <span className="upm-field__hint">
                        {year === currentYear
                          ? "Current year"
                          : year < currentYear
                          ? `${currentYear - year} year(s) ago`
                          : "Future year"}
                      </span>
                    </div>

                    <div className="upm-field">
                      <label className="upm-label">
                        Subject
                        <span className="upm-label__optional"> — optional</span>
                      </label>
                      <div className="upm-select-wrap">
                        <select
                          className="upm-select"
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          disabled={!examName || subjects.length === 0}
                        >
                          <option value="">All subjects</option>
                          {subjects.map((s) => {
                            const section = getSectionLabel(examName, s);
                            return (
                              <option key={s} value={s}>
                                {section ? `${section}: ${s}` : s}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                      <span className="upm-field__hint">
                        Helps the parser focus question mapping
                      </span>
                    </div>

                    {subject && chapters.length > 0 && (
                      <div className="upm-field">
                        <label className="upm-label">
                          Chapter
                          <span className="upm-label__optional"> — optional</span>
                        </label>
                        <div className="upm-select-wrap">
                          <select
                            className="upm-select"
                            value={chapter}
                            onChange={(e) => setChapter(e.target.value)}
                          >
                            <option value="">All chapters</option>
                            {chapters.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {tab === "syllabus" && (
                  <div className="upm-info-box">
                    <span className="upm-info-box__icon">ℹ</span>
                    <span>
                      Upload once per exam. The official syllabus PDF defines the
                      canonical subject and chapter tree — all question papers for
                      this exam will map against it.
                    </span>
                  </div>
                )}

                {/* Drop zone */}
                <div
                  className={`upm-dropzone ${dragging ? "upm-dropzone--drag" : ""} ${file ? "upm-dropzone--filled" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => !file && fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    style={{ display: "none" }}
                    onChange={handleFileChange}
                  />
                  {file ? (
                    <div className="upm-dropzone__file">
                      <span className="upm-dropzone__file-icon">📄</span>
                      <div className="upm-dropzone__file-info">
                        <span className="upm-dropzone__file-name">{file.name}</span>
                        <span className="upm-dropzone__file-size">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                      <button
                        type="button"
                        className="upm-dropzone__remove"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="upm-dropzone__empty">
                      <span className="upm-dropzone__empty-icon">
                        {dragging ? "⬇" : "☁"}
                      </span>
                      <span className="upm-dropzone__empty-title">
                        {dragging ? "Drop it here" : "Drop PDF here"}
                      </span>
                      <span className="upm-dropzone__empty-sub">
                        or <span className="upm-dropzone__browse">browse</span>
                        {" "}· Max 50 MB
                      </span>
                    </div>
                  )}
                </div>

                {message && (
                  <div className={`upm-msg ${status === "error" ? "upm-msg--error" : "upm-msg--info"}`}>
                    {message}
                  </div>
                )}

                <div className="upm-actions">
                  <button
                    type="button"
                    className="upm-btn upm-btn--ghost"
                    onClick={onClose}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="upm-btn upm-btn--primary"
                    disabled={status === "loading" || !file || !examName}
                  >
                    {status === "loading" ? (
                      <span className="upm-btn__spinner" />
                    ) : tab === "paper" ? (
                      "Upload Paper"
                    ) : (
                      "Upload Syllabus"
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="upm-success">
                <div className="upm-success__icon">✓</div>
                <div className="upm-success__title">
                  {tab === "paper" ? "Paper uploaded" : "Syllabus uploaded"}
                </div>
                <div className="upm-success__msg">{message}</div>
                {tab === "paper" && (
                  <div className="upm-success__note">
                    OCR and question mapping are running in the background.
                    Check the papers list to track processing status.
                  </div>
                )}
                <div className="upm-actions">
                  <button
                    className="upm-btn upm-btn--ghost"
                    onClick={() => { reset(); setTab("paper"); }}
                  >
                    Upload another
                  </button>
                  <button className="upm-btn upm-btn--primary" onClick={onClose}>
                    Done
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  AdminTopbar
// ─────────────────────────────────────────────────────────

export default function AdminTopbar({ range, onRangeChange, onExit }) {
  const [showUpload, setShowUpload] = useState(false);

  return (
    <>
      <div className="adm-topbar">
        <div>
          <div className="adm-topbar__title">Overview</div>
          <div className="adm-topbar__subtitle">NoteForge Analytics</div>
        </div>

        <div className="adm-topbar__right">
          <div className="adm-topbar__live">
            <div className="adm-topbar__live-dot" />
            LIVE
          </div>

          <div className="adm-topbar__range">
            {["daily", "weekly", "monthly"].map((r) => (
              <button
                key={r}
                className={`adm-topbar__range-btn ${range === r ? "adm-topbar__range-btn--active" : ""}`}
                onClick={() => onRangeChange(r)}
              >
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>

          <button
            className="adm-topbar__upload"
            onClick={() => setShowUpload(true)}
          >
            ⬆ Upload
          </button>
        </div>
      </div>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
    </>
  );
}