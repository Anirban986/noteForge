import "./ExamTrends.css";
import { EXAM_TRENDS } from "../data/adminData";

export default function ExamTrends() {
  return (
    <div className="adm-et">
      <div className="adm-et__head">
        <div className="adm-et__title">Exam Trends</div>
        <div className="adm-et__sub">Notes uploaded by target exam</div>
      </div>

      <div className="adm-et__body">
        {EXAM_TRENDS.map(e => (
          <div key={e.name} className="adm-et__item">
            <div className="adm-et__row">
              <span className="adm-et__name">{e.name}</span>
              <span className="adm-et__count">{e.uploads.toLocaleString()} notes</span>
            </div>
            <div className="adm-et__bar-track">
              <div className="adm-et__bar-fill"
                style={{ width:`${(e.uploads / e.max) * 100}%`, background: e.color }} />
            </div>
            <div className="adm-et__badges">
              <span className="adm-et__badge" style={{
                color: e.color,
                borderColor: `${e.color}30`,
                background: `${e.color}12`,
              }}>
                {e.users} users
              </span>
              {e.tags.map(t => (
                <span key={t} className="adm-et__badge" style={{
                  color: "#3d4d60",
                  borderColor: "rgba(255,255,255,0.07)",
                  background: "transparent",
                }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
