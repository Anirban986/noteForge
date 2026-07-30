import "./PreviousTests.css";
import Card from "../../../ui/Card/Card";
import Badge from "../../../ui/Badge/Badge";
import Button from "../../../ui/Button/Button";
import ProgressBar from "../../../ui/ProgressBar/ProgressBar";
import { PREV_TESTS } from "../../../../data/mockData";

const scoreStyle = score => ({
  color:       score>=80 ? "#2f9e44" : score>=65 ? "#f59f00" : "#e8590c",
  background:  score>=80 ? "#ebfbee" : score>=65 ? "#fff9db" : "#fff4e6",
  barColor:    score>=80 ? "#2f9e44" : score>=65 ? "#f59f00" : "#e8590c",
});

export default function PreviousTests() {
  return (
    <div className="prev-tests fade-up">
      {/* Under development banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "rgba(245,159,0,0.14)",
          border: "1px solid rgba(245,159,0,0.45)",
          borderRadius: 10,
          padding: "14px 18px",
          marginBottom: 20,
        }}
      >
        <span style={{ fontSize: 22 }}>🚧</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#e8590c" }}>
            This page is under development
          </div>
          <div style={{ fontSize: 13, color: "#8a6d3b" }}>
            Data shown below is a preview and not yet functional.
          </div>
        </div>
        <Badge color="orange">Under Development</Badge>
      </div>

      <div className="prev-tests__header">
        <h1 className="prev-tests__title">Previous Tests</h1>
        <p className="prev-tests__subtitle">Your test history with detailed performance breakdown.</p>
      </div>

      <div style={{ filter: "blur(1.5px)", pointerEvents: "none" }}>
        {/* Summary stats */}
        <div className="prev-tests__summary">
          {[["Tests Taken","4"],["Avg Score","74.5%"],["Best Score","85%"]].map(([l,v]) => (
            <Card key={l} style={{ textAlign:"center" }}>
              <div className="prev-tests__summary-val">{v}</div>
              <div className="prev-tests__summary-label">{l}</div>
            </Card>
          ))}
        </div>

        {/* Test list */}
        {PREV_TESTS.map(t => {
          const s = scoreStyle(t.score);
          return (
            <Card key={t.id} hover style={{ marginBottom: 12 }}>
              <div className="test-row">
                <div className="test-row__score-box" style={{ background: s.background }}>
                  <div className="test-row__score" style={{ color: s.color }}>{t.score}</div>
                  <div className="test-row__score-denom">/ 100</div>
                </div>

                <div className="test-row__info">
                  <div className="test-row__name">{t.name}</div>
                  <div className="test-row__meta">
                    <span>📅 {t.date}</span>
                    <span>❓ {t.q} questions</span>
                    <span>⏱ {t.time}</span>
                    <Badge color="accent" size="xs">{t.subject}</Badge>
                  </div>
                </div>

                <div className="test-row__bar">
                  <ProgressBar value={t.score} height={6} color={s.barColor} />
                </div>

                <Button variant="ghost" size="sm">Review →</Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}