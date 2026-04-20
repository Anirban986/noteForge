import "./CohortTable.css";
import { COHORT_DATA } from "../data/adminData";

const WEEKS = ["W0","W1","W2","W3","W4","W5","W6"];

function cellStyle(val) {
  if (val === null) return { background:"transparent", color:"transparent" };
  const alpha = 0.1 + (val / 100) * 0.65;
  return {
    background: `rgba(0,229,160,${alpha})`,
    color: val > 60 ? "#00e5a0" : val > 30 ? "#7ad4b0" : "#7a8899",
  };
}

export default function CohortTable() {
  return (
    <div className="adm-cohort">
      <div className="adm-cohort__head">
        <div className="adm-cohort__title">Cohort Retention</div>
        <div className="adm-cohort__sub">% active per week after signup</div>
      </div>

      <div className="adm-cohort__body">
        <table className="adm-cohort__table">
          <thead>
            <tr>
              <th>Cohort</th>
              {WEEKS.map(w => <th key={w}>{w}</th>)}
            </tr>
          </thead>
          <tbody>
            {COHORT_DATA.map(row => (
              <tr key={row.month}>
                <td>{row.month}</td>
                {WEEKS.map(w => {
                  const val = row[w.toLowerCase()];
                  return (
                    <td key={w}>
                      <div className="adm-cohort__cell" style={cellStyle(val)}>
                        {val !== null ? `${val}%` : ""}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="adm-cohort__legend">
          <span className="adm-cohort__legend-label">Low</span>
          {[0.15,0.3,0.5,0.75,0.9].map((a,i) => (
            <div key={i} className="adm-cohort__legend-swatch"
              style={{ background:`rgba(0,229,160,${a})` }} />
          ))}
          <span className="adm-cohort__legend-label">High</span>
        </div>
      </div>
    </div>
  );
}
