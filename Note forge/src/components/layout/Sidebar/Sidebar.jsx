import "./Sidebar.css";

const NAV_ITEMS = [
  { key: "dashboard",    icon: "⊞", label: "Dashboard"  },
  { key: "my-notes",     icon: "📋", label: "My Notes",  badge: "5" },
  { key: "upload-notes", icon: "⬆",  label: "Upload"    },
];

export default function Sidebar({ page, onNav, onUpgrade, isPremium, isAdmin }) {
  return (
    <aside className="sidebar">
      <div className="sidebar__label">Workspace</div>

      {NAV_ITEMS.map((item) => (
        <div
          key={item.key}
          className={`sidebar__item ${page === item.key ? "sidebar__item--active" : ""}`}
          onClick={() => onNav(item.key)}
        >
          <span className="sidebar__item__icon">{item.icon}</span>
          {item.label}
          {item.badge && (
            <span className="sidebar__item__badge">{item.badge}</span>
          )}
        </div>
      ))}

      {/* ✅ ADMIN SECTION */}
      {isAdmin && (
        <>
          <div className="sidebar__label" style={{ marginTop: 8 }}>
            Admin
          </div>

          <div
            className={`sidebar__item ${page === "admin" ? "sidebar__item--active" : ""}`}
            onClick={() => onNav("admin")}
          >
            <span className="sidebar__item__icon">🛠</span>
            Admin Dashboard
          </div>
        </>
      )}

      <div className="sidebar__label" style={{ marginTop: 8 }}>
        {isPremium ? "Premium" : "Upgrade"}
      </div>

      <div
        className="sidebar__item"
        onClick={() => isPremium ? onNav("exam-mode") : onUpgrade()}
      >
        <span className="sidebar__item__icon">⭐</span>
        Exam Mode
        {!isPremium && <span className="sidebar__item__lock">🔒</span>}
      </div>

      {!isPremium && (
        <div className="sidebar__upgrade" onClick={onUpgrade}>
          <div className="sidebar__upgrade__title">✨ Go Premium</div>
          <div className="sidebar__upgrade__desc">
            Unlimited uploads, Exam Mode & smart AI tools.
          </div>
          <button className="sidebar__upgrade__btn">Upgrade — Rs.99/mo</button>
        </div>
      )}
    </aside>
  );
}