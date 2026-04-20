import "./AdminSidebar.css";
import { SIDEBAR_NAV } from "../data/adminData";

export default function AdminSidebar({ activeNav, onNav,onExit }) {
  return (
    <aside className="adm-sb">
      <div className="adm-sb__brand">
        <div className="adm-sb__mark">Nf</div>
        <span className="adm-sb__name">Note<span>Forge</span></span>
        <span className="adm-sb__badge">ADMIN</span>
      </div>

      <div className="adm-sb__section">
        <div className="adm-sb__section-label">Analytics</div>
        {SIDEBAR_NAV.map(item => (
          <div
            key={item.key}
            className={`adm-sb__item ${activeNav === item.key ? "adm-sb__item--active" : ""}`}
            onClick={() => onNav(item.key)}
          >
            <span className="adm-sb__item__icon">{item.icon}</span>
            {item.label}
            {item.dot && activeNav !== item.key && (
              <div className="adm-sb__item__dot" />
            )}
          </div>
        ))}
      </div>

      <div className="adm-sb__footer">
        <div className="adm-sb__user">
          <div className="adm-sb__avatar">AD</div>
          <div>
            <div className="adm-sb__user-name">Admin</div>
            <div className="adm-sb__user-role">Super Admin</div>
          </div>
        </div>
        <button className='exit-btn-bottom' onClick={onExit}>Exit</button>
      </div>
    </aside>
  );
}
