import "./RecentUsers.css";
import { RECENT_USERS } from "../data/adminData";

export default function RecentUsers() {
  return (
    <div className="adm-ru">
      <div className="adm-ru__head">
        <div>
          <div className="adm-ru__title">Recent Signups</div>
          <div className="adm-ru__sub">Latest registrations</div>
        </div>
        <button className="adm-ru__view-all">View all →</button>
      </div>

      <div className="adm-ru__body">
        {RECENT_USERS.map(u => (
          <div key={u.email} className="adm-ru__row">
            <div className="adm-ru__avatar" style={{ background: u.color }}>
              {u.initials}
            </div>

            <div className="adm-ru__info">
              <div className="adm-ru__name">{u.name}</div>
              <div className="adm-ru__email">{u.email}</div>
            </div>

            <span className={`adm-ru__plan adm-ru__plan--${u.plan}`}>
              {u.plan}
            </span>

            <span className="adm-ru__time">{u.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
