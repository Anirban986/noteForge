import "./Navbar.css";
import Badge from "../../ui/Badge/Badge";

/**
 * Navbar
 * @param {boolean}  isPremium
 * @param {object|null} user      — null = not logged in, { name, email } = logged in
 * @param {function} onSignUp     — open signup modal
 * @param {function} onLogIn      — open login modal
 * @param {function} onLogOut
 */
export default function Navbar({ isPremium, user, onSignUp, onLogIn, onLogOut }) {
  const initials = user?.name
    ? user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <nav className="navbar">
      {/* Logo */}
      <div className="navbar__logo">
        <div className="navbar__logomark">Nf</div>
        <span className="navbar__logotype">
          Note<span>Forge</span>
        </span>
      </div>

      {/* Search — only shown when logged in */}
      {user && (
        <div className="navbar__search">
          <span className="navbar__search-icon">🔍</span>
          <input
            className="navbar__search-input"
            placeholder="Search notes, topics…"
          />
        </div>
      )}

      {/* Right side */}
      <div className="navbar__right">
        {user ? (
          /* ── Logged in ── */
          <>
            {isPremium
              ? <Badge color="accent">⭐ Premium</Badge>
              : <Badge color="gray">Free</Badge>
            }
            <div className="navbar__user-menu">
              <div className="navbar__avatar" title={user.name}>{initials}</div>
              <div className="navbar__dropdown">
                <div className="navbar__dropdown-name">{user.name}</div>
                <div className="navbar__dropdown-email">{user.email}</div>
                <div className="navbar__dropdown-divider" />
                <button className="navbar__dropdown-item" onClick={onLogOut}>
                  Sign out
                </button>
              </div>
            </div>
          </>
        ) : (
          /* ── Logged out ── */
          <>
            <button className="navbar__btn-login" onClick={onLogIn}>Log in</button>
            <button className="navbar__btn-signup" onClick={onSignUp}>Sign up free →</button>
          </>
        )}
      </div>
    </nav>
  );
}