import "./TopNotes.css";
import { TOP_NOTES } from "../data/adminData";

const ICON_BG = [
  "rgba(59,91,219,0.15)",
  "rgba(47,158,68,0.15)",
  "rgba(245,159,0,0.15)",
  "rgba(112,72,232,0.15)",
  "rgba(224,49,49,0.15)",
  "rgba(0,212,255,0.12)",
];

export default function TopNotes() {
  return (
    <div className="adm-tn">
      <div className="adm-tn__head">
        <div className="adm-tn__title">Top Notes</div>
        <div className="adm-tn__sub">Most viewed &amp; uploaded this month</div>
      </div>

      <div className="adm-tn__body">
        {TOP_NOTES.map((n, i) => (
          <div key={n.name} className="adm-tn__row">
            <span className="adm-tn__rank">{String(i + 1).padStart(2, "0")}</span>

            <div className="adm-tn__icon" style={{ background: ICON_BG[i] }}>
              {n.icon}
            </div>

            <div className="adm-tn__info">
              <div className="adm-tn__name">{n.name}</div>
              <div className="adm-tn__sub-label">{n.sub}</div>
            </div>

            <div className="adm-tn__stats">
              <div className="adm-tn__views">{n.views.toLocaleString()}</div>
              <div className="adm-tn__uploads">{n.uploads} uploads</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
