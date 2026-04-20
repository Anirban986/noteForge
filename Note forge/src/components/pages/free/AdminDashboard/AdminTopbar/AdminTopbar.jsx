import "./AdminTopbar.css";

export default function AdminTopbar({ range, onRangeChange, onExit }) {
  return (
    <div className="adm-topbar">
      <div>
        <div className="adm-topbar__title">Overview</div>
        <div className="adm-topbar__subtitle">NoteForge Analytics</div>
      </div>
      
      <div className="adm-topbar__right">
        <div className="adm-topbar__live">
          <div className="adm-topbar__live-dot" />
          LIVE
        </div>

        <div className="adm-topbar__range">
          {["daily", "weekly", "monthly"].map(r => (
            <button
              key={r}
              className={`adm-topbar__range-btn ${range === r ? "adm-topbar__range-btn--active" : ""}`}
              onClick={() => onRangeChange(r)}
            >
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>

        <button className="adm-topbar__export">↓ Export</button>
      </div>
    </div>
  );
}
