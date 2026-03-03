import { useState, useEffect, useRef } from "react";
import "./MockTest.css";
import Card from "../../../ui/Card/Card";
import Badge from "../../../ui/Badge/Badge";
import Button from "../../../ui/Button/Button";
import SectionTitle from "../../../ui/SectionTitle/SectionTitle";
import { MOCK_QUESTIONS, PREV_TESTS } from "../../../../data/mockData";

const fmt = s => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

/* ── Config ── */
function ConfigScreen({ config, setConfig, onStart }) {
  return (
    <div className="mock fade-up">
      <div className="mock__header">
        <h1 className="mock__title">Mock Test Generator</h1>
        <p className="mock__subtitle">Generate a realistic mock test based on GATE exam patterns.</p>
      </div>

      <div className="mock-config__grid">
        <div>
          <Card style={{ marginBottom: 16 }}>
            <SectionTitle>Test Configuration</SectionTitle>
            <div className="mock-config__form-row">
              {[
                { label:"Subject",    key:"subject",    opts:["All Subjects","Data Structures","Algorithms","Operating Systems","DBMS","Computer Networks"] },
                { label:"Difficulty", key:"difficulty", opts:["Easy","Medium","Hard","Mixed"] },
              ].map(f => (
                <div key={f.key}>
                  <label className="mock-config__label">{f.label}</label>
                  <select className="mock-config__select"
                    value={config[f.key]}
                    onChange={e => setConfig(c => ({...c, [f.key]: e.target.value}))}>
                    {f.opts.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <div>
              <div className="mock-config__slider-label">
                Number of Questions: <span style={{ color:"#3b5bdb" }}>{config.length}</span>
              </div>
              <input type="range" min={5} max={65} step={5}
                value={config.length}
                onChange={e => setConfig(c => ({...c, length: +e.target.value}))}
                style={{ width:"100%", accentColor:"#3b5bdb" }} />
              <div className="mock-config__slider-range">
                <span>5 (Quick)</span><span>35 (Standard)</span><span>65 (Full GATE)</span>
              </div>
            </div>
          </Card>

          <div className="mock-config__preview">
            <div className="mock-config__preview-title">Test Preview</div>
            <div className="mock-config__preview-stats">
              {[["Questions", config.length], ["Duration", `${config.length * 2} min`], ["Marks", config.length]].map(([l,v]) => (
                <div key={l} className="mock-config__stat">
                  <div className="mock-config__stat-val">{v}</div>
                  <div className="mock-config__stat-label">{l}</div>
                </div>
              ))}
            </div>
          </div>

          <Button size="lg" onClick={onStart}>🚀 Start Mock Test</Button>
        </div>

        <Card style={{ height:"fit-content" }}>
          <SectionTitle>Previous Best Scores</SectionTitle>
          {PREV_TESTS.slice(0,3).map(t => (
            <div key={t.id} className="prev-score-row">
              <div>
                <div className="prev-score-row__name">{t.name}</div>
                <div className="prev-score-row__meta">{t.date} · {t.q}Q</div>
              </div>
              <div style={{
                fontFamily:"'Lora',serif", fontSize:20, fontWeight:700,
                color: t.score>=80 ? "#2f9e44" : t.score>=65 ? "#f59f00" : "#e8590c",
              }}>{t.score}%</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

/* ── Test ── */
function TestScreen({ config, onSubmit }) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [marked,  setMarked]  = useState(new Set());
  const [timeLeft,setTimeLeft]= useState(config.length * 120);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setTimeLeft(t => Math.max(0, t-1)), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const qi = current % MOCK_QUESTIONS.length;
  const q  = MOCK_QUESTIONS[qi];

  const toggleMark = () => setMarked(m => {
    const s = new Set(m); s.has(current) ? s.delete(current) : s.add(current); return s;
  });

  const PALETTE_COUNT = Math.min(config.length, 20);

  return (
    <div className="fade-up">
      <div className="test-header">
        <span className="test-header__title">GATE Mock Test</span>
        <span className="test-timer" style={{ color: timeLeft < 300 ? "#e03131" : "#1a1d2e" }}>
          {fmt(timeLeft)}
        </span>
        <Button variant="secondary" size="sm" onClick={() => onSubmit(answers)}>Submit Test</Button>
      </div>

      <div className="test-grid">
        <Card>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
            <span className="question-label">Question {current+1} of {config.length}</span>
            <Badge color={marked.has(current) ? "amber" : "gray"} size="xs">
              {marked.has(current) ? "⚑ Marked" : q.topic}
            </Badge>
          </div>

          <div className="question-text">{q.q}</div>

          {q.opts.map((opt, i) => (
            <div key={i}
              className={`question-option ${answers[qi] === i ? "question-option--selected" : ""}`}
              onClick={() => setAnswers(a => ({...a, [qi]: i}))}>
              <span className="question-option__key">({String.fromCharCode(65+i)})</span>
              {opt}
            </div>
          ))}

          <div className="question-actions">
            <Button variant="secondary" disabled={current===0} onClick={() => setCurrent(c=>c-1)}>← Prev</Button>
            <Button disabled={current===config.length-1} onClick={() => setCurrent(c=>c+1)}>Next →</Button>
            <Button variant="ghost" style={{ marginLeft:"auto" }} onClick={toggleMark}>
              {marked.has(current) ? "⚑ Unmark" : "⚐ Mark for Review"}
            </Button>
          </div>
        </Card>

        <Card style={{ height:"fit-content" }}>
          <div className="palette__label">Question Palette</div>
          <div className="palette__grid">
            {Array.from({ length: PALETTE_COUNT }, (_, i) => {
              const isActive   = i === current;
              const isMarked   = marked.has(i);
              const isAnswered = answers[i % MOCK_QUESTIONS.length] !== undefined;
              const bg  = isActive?"#3b5bdb":isMarked?"#fff9db":isAnswered?"#ebfbee":"#f0f2f8";
              const col = isActive?"#fff"   :isMarked?"#f59f00":isAnswered?"#2f9e44":"#9399a6";
              const bdr = isActive?"#3b5bdb":isMarked?"#f59f00":isAnswered?"#2f9e44":"#e3e6f0";
              return (
                <div key={i} className="palette__cell"
                  style={{ background:bg, color:col, borderColor:bdr }}
                  onClick={() => setCurrent(i)}>
                  {i+1}
                </div>
              );
            })}
          </div>
          <div className="palette__legend">
            {[["Answered","#2f9e44","#ebfbee"],["Marked","#f59f00","#fff9db"],["Current","#3b5bdb","#eef2ff"],["Not visited","#9399a6","#f0f2f8"]].map(([l,c,bg])=>(
              <div key={l} className="palette__legend-item">
                <div className="palette__legend-swatch" style={{ background:bg, borderColor:c }} />
                <span>{l}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ── Review ── */
function ReviewScreen({ answers, config, onRetry }) {
  const attempted = Object.keys(answers).length;
  const score     = Object.entries(answers).filter(([qi,ai]) => MOCK_QUESTIONS[+qi]?.ans === +ai).length;
  const pct       = attempted ? Math.round((score/attempted)*100) : 0;

  return (
    <div className="fade-up">
      <div className="mock__header">
        <h1 className="mock__title">Test Results</h1>
      </div>

      <div className="review__stats">
        {[
          ["Score",      `${score}/${attempted}`, "#3b5bdb"],
          ["Percentage", `${pct}%`,               pct>=70?"#2f9e44":"#e8590c"],
          ["Attempted",  `${attempted}/${config.length}`, "#1a1d2e"],
          ["Accuracy",   `${pct}%`,               "#1a1d2e"],
        ].map(([l,v,c]) => (
          <Card key={l} style={{ textAlign:"center" }}>
            <div className="review__stat-val" style={{ color:c }}>{v}</div>
            <div className="review__stat-label">{l}</div>
          </Card>
        ))}
      </div>

      <div style={{ marginBottom:24 }}>
        <Button onClick={onRetry}>← New Test</Button>
      </div>

      {MOCK_QUESTIONS.map((q, i) => (
        <div key={i} className="review__q-card"
          style={{ borderLeftColor: answers[i]===q.ans?"#2f9e44":"#e03131" }}>
          <div className="review__q-header">
            <span style={{ fontSize:16 }}>{answers[i]===q.ans?"✅":"❌"}</span>
            <span className="review__q-text">Q{i+1}. {q.q}</span>
          </div>
          <div className="review__correct">✓ Correct: {q.opts[q.ans]}</div>
          {answers[i]!==undefined && answers[i]!==q.ans && (
            <div className="review__wrong">✗ Your answer: {q.opts[answers[i]]}</div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Export ── */
export default function MockTest() {
  const [config,  setConfig]  = useState({ subject:"All Subjects", difficulty:"Medium", length:20 });
  const [screen,  setScreen]  = useState("config");
  const [answers, setAnswers] = useState({});

  if (screen === "config") return <ConfigScreen config={config} setConfig={setConfig} onStart={() => setScreen("test")} />;
  if (screen === "test")   return <TestScreen config={config} onSubmit={ans => { setAnswers(ans); setScreen("review"); }} />;
  return <ReviewScreen answers={answers} config={config} onRetry={() => { setAnswers({}); setScreen("config"); }} />;
}