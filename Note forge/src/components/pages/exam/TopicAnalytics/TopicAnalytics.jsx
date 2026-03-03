import "./TopicAnalytics.css";
import Card from "../../../ui/Card/Card";
import SectionTitle from "../../../ui/SectionTitle/SectionTitle";
import { ANALYTICS_DATA } from "../../../../data/mockData";

const MONTHS      = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const YEARS       = ["2019","2020","2021","2022","2023"];
const HEAT_COLORS = ["#f0f2f8","#c5cdf8","#909de8","#5566d4","#3b5bdb"];

const maxWeight = Math.max(...ANALYTICS_DATA.weightage.map(t => t.weight));

const weakColor = score =>
  score < 50 ? "#e03131" : score < 65 ? "#e8590c" : "#f59f00";

export default function TopicAnalytics() {
  return (
    <div className="analytics fade-up">
      <div className="analytics__header">
        <h1 className="analytics__title">Topic Analytics</h1>
        <p className="analytics__subtitle">Weightage distribution, exam frequency, and weak area identification.</p>
      </div>

      <div className="analytics__grid">
        {/* Weightage */}
        <Card>
          <SectionTitle>Topic Weightage Distribution</SectionTitle>
          {ANALYTICS_DATA.weightage.map(t => (
            <div key={t.topic} className="weight-row">
              <div className="weight-row__labels">
                <span style={{ fontWeight: 500 }}>{t.topic}</span>
                <span className="weight-row__marks">{t.weight} marks</span>
              </div>
              <div className="weight-row__track">
                <div className="weight-row__fill"
                  style={{
                    width: `${(t.weight / maxWeight) * 100}%`,
                    background: t.weight >= 13 ? "#3b5bdb" : t.weight >= 10 ? "#4c6ef5" : "#748ffc",
                  }} />
              </div>
            </div>
          ))}
        </Card>

        {/* Weak areas */}
        <Card>
          <SectionTitle>Weak Areas</SectionTitle>
          <div style={{ fontSize:12, color:"#9399a6", marginBottom:12 }}>Your score vs target (80%) by topic</div>
          {ANALYTICS_DATA.weakAreas.map(w => (
            <div key={w.topic} className="weak-row">
              <div className="weak-row__labels">
                <span>{w.topic}</span>
                <div>
                  <span className="weak-row__score" style={{ color: weakColor(w.score) }}>{w.score}%</span>
                  <span className="weak-row__target"> / {w.target}%</span>
                </div>
              </div>
              <div className="weak-row__track">
                <div className="weak-row__fill" style={{ width:`${w.score}%`, background: weakColor(w.score) }} />
                <div className="weak-row__target-line" style={{ left:`${w.target}%` }} />
              </div>
            </div>
          ))}
          <div className="weak-row__target-legend">
            <div style={{ width:12, height:2, background:"#aaa" }} />
            Target line (80%)
          </div>
        </Card>
      </div>

      {/* Heatmap */}
      <Card className="heatmap-card">
        <SectionTitle>GATE Exam Frequency Heatmap</SectionTitle>
        <div style={{ fontSize:12, color:"#9399a6", marginBottom:16 }}>
          Topic appearance across past 5 years — darker = more frequent
        </div>
        <table className="heatmap__table">
          <thead>
            <tr>
              <td style={{ width:60 }} />
              {MONTHS.map(m => <th key={m} className="heatmap__month">{m}</th>)}
            </tr>
          </thead>
          <tbody>
            {ANALYTICS_DATA.heatmap.map((row, ri) => (
              <tr key={ri}>
                <td className="heatmap__year">{YEARS[ri]}</td>
                {row.map((v, ci) => (
                  <td key={ci} style={{ padding:"3px 4px", textAlign:"center" }}>
                    <div className="heatmap__cell"
                      style={{ background: HEAT_COLORS[Math.min(v-1,4)], color: v >= 4 ? "#fff" : "#9399a6" }}>
                      {v}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="heatmap__legend">
          Less frequent
          {HEAT_COLORS.map(c => <div key={c} className="heatmap__swatch" style={{ background: c }} />)}
          More frequent
        </div>
      </Card>
    </div>
  );
}