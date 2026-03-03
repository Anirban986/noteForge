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
      <div className="prev-tests__header">
        <h1 className="prev-tests__title">Previous Tests</h1>
        <p className="prev-tests__subtitle">Your test history with detailed performance breakdown.</p>
      </div>

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
  );
}