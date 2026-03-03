import { useState } from "react";
import "./UploadNotesPage.css";
import Card from "../../../ui/Card/Card";
import Badge from "../../../ui/Badge/Badge";
import Button from "../../../ui/Button/Button";
import ProgressBar from "../../../ui/ProgressBar/ProgressBar";

const STEPS = ["Upload", "Extracting Text", "Understanding", "Generating Notes"];

export default function UploadNotesPage({ isPremium, onUpgrade, user, onAuthRequired }) {
  const [stage,    setStage]    = useState("idle");
  const [progress, setProgress] = useState(0);
  const [step,     setStep]     = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);

  // Gate: if not logged in, show auth modal instead of uploading
  const requireAuth = (action) => {
    if (!user) { onAuthRequired(); return; }
    action();
  };

  const runUpload = () => {
    setStage("uploading");
    setProgress(0);
    setStep(0);
    if (isPremium) setUploadCount(c => c + 1);

    const upInt = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(upInt);
          setStage("processing");
          setStep(1);
          runProcessing();
          return 100;
        }
        return p + 5;
      });
    }, 60);
  };

  const runProcessing = () => {
    let s = 1;
    const iv = setInterval(() => {
      s++;
      setStep(s);
      if (s >= STEPS.length - 1) {
        clearInterval(iv);
        setTimeout(() => setStage("done"), 600);
      }
    }, 1200);
  };

  return (
    <div className="upload-page fade-up">
      <div className="upload-page__header">
        <h1 className="upload-page__title">Upload Notes</h1>
        <p className="upload-page__subtitle">Upload a PDF and let AI structure it for you.</p>
      </div>

      {/* Plan status bar */}
      {isPremium ? (
        <div className="upload-limit upload-limit--premium">
          <div style={{ flex: 1 }}>
            <div className="upload-limit__label">
              ⭐ Premium Plan — Unlimited uploads
              {uploadCount > 0 && <span style={{ color: "#9399a6", fontWeight: 400 }}> · {uploadCount} uploaded this session</span>}
            </div>
            <ProgressBar value={uploadCount > 0 ? Math.min(uploadCount * 5, 40) : 0} color="#2f9e44" height={6} />
          </div>
          <Badge color="green">Unlimited ✓</Badge>
        </div>
      ) : (
        <div className="upload-limit">
          <div style={{ flex: 1 }}>
            <div className="upload-limit__label">Free Plan — 5 / 5 uploads used</div>
            <ProgressBar value={100} height={6} />
          </div>
          <Button onClick={onUpgrade}>✨ Upgrade for Unlimited</Button>
        </div>
      )}

      {/* Dropzone */}
      {stage === "idle" && (
        <>
          {isPremium ? (
            /* ── Premium: fully unlocked dropzone ── */
            <div
              className={`dropzone dropzone--unlocked ${dragOver ? "dropzone--over" : ""}`}
              onClick={() => requireAuth(runUpload)}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); requireAuth(runUpload); }}
            >
              <div className="dropzone__icon">📂</div>
              <div className="dropzone__title">Drop your PDF here</div>
              <div className="dropzone__sub">PDF, JPG, PNG · Up to 50MB · Unlimited uploads</div>
              <Button size="lg">Choose File</Button>
            </div>
          ) : (
            /* ── Free: locked dropzone ── */
            <>
              <div
                className={`dropzone ${dragOver ? "dropzone--over" : ""}`}
                onClick={() => requireAuth(onUpgrade)}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); requireAuth(onUpgrade); }}
              >
                <div className="dropzone__icon">📂</div>
                <div className="dropzone__title">Drop your PDF here</div>
                <div className="dropzone__sub">Upgrade required · PDF up to 50MB</div>
                <Button onClick={e => { e.stopPropagation(); requireAuth(onUpgrade); }}>
                  🔒 Upgrade to Upload
                </Button>
              </div>
              <div style={{ textAlign: "center" }}>
                <Button variant="ghost" onClick={() => requireAuth(runUpload)}>👁 Preview AI Processing Demo</Button>
              </div>
            </>
          )}
        </>
      )}

      {/* Stepper */}
      {(stage === "uploading" || stage === "processing") && (
        <Card style={{ marginBottom: 20 }}>
          <div className="stepper">
            {STEPS.map((s, i) => (
              <div key={s} className="stepper__step">
                {i < STEPS.length - 1 && (
                  <div
                    className="stepper__connector"
                    style={{ background: i < step ? "#3b5bdb" : "#e3e6f0" }}
                  />
                )}
                <div
                  className="stepper__circle"
                  style={{
                    background:  i < step ? "#3b5bdb" : i === step ? "#eef2ff" : "#f0f2f8",
                    borderColor: i < step ? "#3b5bdb" : i === step ? "#3b5bdb" : "#e3e6f0",
                    color:       i < step ? "#fff"    : "#3b5bdb",
                  }}
                >
                  {i < step ? "✓" : i === step
                    ? <div className="stepper__spin spin" />
                    : i + 1}
                </div>
                <div
                  className="stepper__label"
                  style={{
                    color:      i <= step ? "#1a1d2e" : "#9399a6",
                    fontWeight: i === step ? 600 : 400,
                  }}
                >
                  {s}
                </div>
              </div>
            ))}
          </div>

          {stage === "uploading"   && <ProgressBar value={progress} />}
          {stage === "processing"  && (
            <div style={{ fontSize: 13, color: "#5c6275" }} className="pulse">
              {STEPS[step]}…
            </div>
          )}
        </Card>
      )}

      {/* Done */}
      {stage === "done" && (
        <Card style={{ borderColor: "#b2f2bb" }} className="fade-up">
          <div className="upload-success__header">
            <div className="upload-success__icon">✅</div>
            <div>
              <div className="upload-success__title">Notes Processed — Organic Chemistry Ch.4</div>
              <div className="upload-success__meta">18 topics detected · Summary generated · Formulas extracted</div>
            </div>
          </div>
          <div className="upload-success__tags">
            {["Nucleophilic Sub.", "Electrophiles", "SN1 vs SN2", "Carbocation Stability", "+14 more"].map(t => (
              <Badge key={t} color="accent">{t}</Badge>
            ))}
          </div>
          <div className="upload-success__actions">
            <Button>⬇ Download PDF</Button>
            <Button variant="secondary">📋 Copy Summary</Button>
            {isPremium && (
              <Button variant="ghost" onClick={() => setStage("idle")} style={{ marginLeft: "auto" }}>
                + Upload Another
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}