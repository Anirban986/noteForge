import "./NewSubsBar.css";
import { NEW_SUBS_DATA } from "../data/adminData";

const RANGE_LABEL = {
  daily:   "Last 15 days",
  weekly:  "Last 8 weeks",
  monthly: "Last 8 months",
};

export default function NewSubsBar({ range }) {
  const data   = NEW_SUBS_DATA[range];
  const maxVal = Math.max(...data);
  const avg    = Math.round(data.reduce((a, b) => a + b) / data.length);

  return (
    <div className="adm-nsb">
      <div className="adm-nsb__head">
        <div className="adm-nsb__title">New Subscribers</div>
        <div className="adm-nsb__sub">{RANGE_LABEL[range]}</div>
      </div>

      <div className="adm-nsb__body">
        <div className="adm-nsb__chart">
          {data.map((v, i) => {
            const isLast = i === data.length - 1;
            return (
              <div key={i} className="adm-nsb__col">
                <div
                  className="adm-nsb__bar"
                  style={{
                    height: `${(v / maxVal) * 140}px`,
                    background: isLast
                      ? "linear-gradient(180deg,#00d4ff,#0090b8)"
                      : "linear-gradient(180deg,rgba(0,212,255,0.5),rgba(0,212,255,0.15))",
                  }}
                  title={`${v}`}
                />
                {data.length <= 10 && (
                  <div className="adm-nsb__x-label">{String(i+1).padStart(2,"0")}</div>
                )}
              </div>
            );
          })}
        </div>

        <div className="adm-nsb__footer">
          <span className="adm-nsb__footer-stat">
            Peak: {maxVal} · Avg: {avg}
          </span>
          <span className="adm-nsb__footer-latest">
            +{data[data.length - 1]} latest
          </span>
        </div>
      </div>
    </div>
  );
}
