import { useState, useEffect } from "react";
import "./ExamUpload.css";
import Card from "../../../ui/Card/Card";
import Button from "../../../ui/Button/Button";
import ProgressBar from "../../../ui/ProgressBar/ProgressBar";
import SectionTitle from "../../../ui/SectionTitle/SectionTitle";
import { EXAM_DATA } from "../ExamData";
import api from "../../../layout/api";
const STEPS = ["Upload", "Extracting Text", "Understanding Content", "Generating Notes"];

export default function ExamUpload({ exam }) {
  const [stage, setStage] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [subject, setSubject] = useState("");
  const [chapters, setChapters] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState("");
  const [file, setFile] = useState(null);


  const examData = EXAM_DATA?.[exam];
  const subjects = examData?.subjects || {};


  // 🔥 When exam changes
  useEffect(() => {
    if (examData) {
      const firstSubject = Object.keys(subjects)[0];

      if (firstSubject) {
        setSubject(firstSubject);

        const firstChapters = subjects[firstSubject].chapters || [];
        setChapters(firstChapters);
        setSelectedChapter(firstChapters[0] || "");
      }
    }
  }, [examData]);


  // 🔥 When subject changes
  useEffect(() => {
    if (subject && subjects[subject]) {
      const newChapters = subjects[subject].chapters || [];
      setChapters(newChapters);
      setSelectedChapter(newChapters[0] || "");
    }
  }, [subject, subjects]);


  const simulate = () => {
    setStage("uploading"); setProgress(0); setStep(0);
    const iv = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(iv); setStage("processing"); setStep(1); runProcessing(); return 100; }
        return p + 5;
      });
    }, 60);
  };

  const handleChapterSelect = (chapter) => {
    if (selectedChapter.includes(chapter)) {
      setSelectedChapter(selectedChapter.filter(c => c !== chapter));
    } else {
      setSelectedChapter([...selectedChapter, chapter]);
    }
  };


  const uploadFile = async (selectedFile) => {
    if (!selectedFile) {
      alert("Please select a file");
      return;
    }

    try {
      const formData = new FormData();

      formData.append("file", selectedFile);
      formData.append("mode", "Exam");
      formData.append("exam", exam);
      formData.append("subject", subject);
      formData.append("chapter", selectedChapter);

      const response = await api.post(
        "/api/notes/premium/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        }
      );

      console.log("Upload success:", response.data);

      // to  run  animation
      simulate();

    } catch (error) {
      console.error("Upload error:", error.response?.data || error.message);
    }
  };


  const runProcessing = () => {
    let s = 1;
    const iv = setInterval(() => {
      s++;
      setStep(s);
      if (s >= STEPS.length - 1) { clearInterval(iv); setTimeout(() => setStage("done"), 600); }
    }, 1200);
  };

  return (
    <div className="exam-upload fade-up">
      <div className="exam-upload__header">
        <h1 className="exam-upload__title">Upload Notes</h1>
        <p className="exam-upload__subtitle">Upload your notes — AI will structure them automatically.</p>
      </div>

      <div className="exam-upload__grid">
        {/* ── Left ── */}
        <div>
          {stage === "idle" && (
            <div
              className={`exam-dropzone ${dragOver ? "exam-dropzone--over" : ""}`}
              
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault();
                setDragOver(false);
                const droppedFile = e.dataTransfer.files[0];
                setFile(droppedFile);

                uploadFile(droppedFile);
              }}
            >
              <div className="exam-dropzone__icon">📂</div>
              <div className="exam-dropzone__title">Drop your PDF here</div>
              <div className="exam-dropzone__sub">PDF, JPG, PNG · Up to 50MB</div>
              <input
                type="file"
                accept=".pdf,.png,.jpg"
                hidden
                id="fileUpload"
                onChange={(e) => {
                  const selectedFile = e.target.files[0];
                  setFile(selectedFile);
                  uploadFile(selectedFile);
                }}
              />
              <Button size="lg" onClick={() => document.getElementById("fileUpload").click()}>
                Choose File
              </Button>
            </div>
          )}

          {(stage === "uploading" || stage === "processing") && (
            <Card style={{ marginBottom: 20 }}>
              <div className="exam-upload__file-row">
                <div className="exam-upload__file-icon">📄</div>
                <div>
                  <div className="exam-upload__file-name">notes_upload.pdf</div>
                  <div className="exam-upload__file-state">Processing…</div>
                </div>
              </div>

              <div className="exam-stepper">
                {STEPS.map((s, i) => (
                  <div key={s} className="exam-stepper__step">
                    {i < STEPS.length - 1 && (
                      <div className="exam-stepper__connector"
                        style={{ background: i < step ? "#3b5bdb" : "#e3e6f0" }} />
                    )}
                    <div className="exam-stepper__circle"
                      style={{
                        background: i < step ? "#3b5bdb" : i === step ? "#eef2ff" : "#f0f2f8",
                        borderColor: i <= step ? "#3b5bdb" : "#e3e6f0",
                        color: i < step ? "#fff" : "#3b5bdb",
                      }}>
                      {i < step ? "✓" : i === step
                        ? <div className="exam-stepper__spin spin" />
                        : i + 1}
                    </div>
                    <div className="exam-stepper__label"
                      style={{ color: i <= step ? "#1a1d2e" : "#9399a6", fontWeight: i === step ? 600 : 400 }}>
                      {s}
                    </div>
                  </div>
                ))}
              </div>

              {stage === "uploading" && <ProgressBar value={progress} />}
              {stage === "processing" && (
                <div className="pulse" style={{ fontSize: 13, color: "#5c6275" }}>{STEPS[step]}…</div>
              )}
            </Card>
          )}

          {stage === "done" && (
            <Card className="exam-upload__success">
              <div className="exam-upload__success-header">
                <div className="exam-upload__success-icon">✅</div>
                <div style={{ flex: 1 }}>
                  <div className="exam-upload__success-title">Notes Processed Successfully</div>
                  <div className="exam-upload__success-meta">18 topics detected · Formulas extracted · Notes ready</div>
                </div>
                <Button>View Notes →</Button>
              </div>
            </Card>
          )}
        </div>

        {/* ── Sidebar form ── */}
        <Card style={{ height: "fit-content" }}>
          <SectionTitle>Note Details</SectionTitle>

          <label className="exam-upload__form-label">Subject</label>
          <select
            className="subject__select"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          >
            {exam &&
              Object.keys(subjects).map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))
            }
          </select>


          <label className="exam-upload__form-label">Chapter / Topic</label>
          <select
            value={selectedChapter}
            className="chapter__select"
            onChange={(e) => setSelectedChapter(e.target.value)}
          >
            {chapters.map((chapter) => (
              <option key={chapter} value={chapter}>
                {chapter}
              </option>
            ))}
          </select>



          <div className="exam-upload__tip">
            💡 AI will auto-detect syllabus coverage and flag missing topics after processing.
          </div>
        </Card>
      </div>
    </div>
  );
}