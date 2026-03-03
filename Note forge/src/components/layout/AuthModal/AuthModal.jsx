import { use, useState } from "react";
import api from "../api"
import "./AuthModal.css";


/* ─────────────────────────────
   Shared brand header
───────────────────────────────*/
function Brand() {
  return (
    <div className="auth-modal__brand">
      <div className="auth-modal__logomark">Nf</div>
      <span className="auth-modal__logotype">
        Note<span>Forge</span>
      </span>
    </div>
  );
}

/* ─────────────────────────────
   Field component
───────────────────────────────*/
function Field({ label, type = "text", value, onChange, error, placeholder, children }) {
  return (
    <div className="auth-field">
      {children ? (
        <div className="auth-field__row">
          <label className="auth-field__label">{label}</label>
          {children}
        </div>
      ) : (
        <label className="auth-field__label">{label}</label>
      )}
      <input
        type={type}
        className={`auth-field__input ${error ? "auth-field__input--error" : ""}`}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={type === "password" ? "current-password" : type === "email" ? "email" : "off"}
      />
      {error && <div className="auth-field__error">⚠ {error}</div>}
    </div>
  );
}

/* ─────────────────────────────
   Sign Up screen
───────────────────────────────*/
function SignUpScreen({ onSwitch, onSuccess, onClose }) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverMessages, setServermessages] = useState(null);
  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = "Name is required";
    if (!username.trim()) e.username = "Username is required";
    if (!email.includes("@")) e.email = "Enter a valid email";
    if (password.length < 8) e.password = "At least 8 characters";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setLoading(true);


    try {
      const { data } = await api.post("/api/auth/register",
        { name, username, email, password },
      );
      setServermessages({ type: "Success", text: data.message })
      onSuccess(data.user);

    } catch (err) {
      if (!err.response) {
        setErrors({ name: "Network error. Please try again." });
        return;
      }

      const { status, data } = err.response;
      if (status === 400) setErrors({ name: data.error });
      if (status === 409) setErrors({ email: data.message });
      setServermessages({ type: "error", text: data.message });
    }

  };

  return (
    <>
      <Brand />
      <h2 className="auth-modal__title">Create your account</h2>
      <p className="auth-modal__subtitle">Start for free. No credit card required.</p>

      <Field label="Full Name" value={name} onChange={setName}
        placeholder="Say your name" error={errors.name} />

      <Field label="Username" value={username} onChange={setUsername}
        placeholder="Your username" error={errors.username} />

      <Field label="Email" type="email" value={email} onChange={setEmail}
        placeholder="alex@example.com" error={errors.email} />

      <Field label="Password" type="password" value={password} onChange={setPassword}
        placeholder="Min. 8 characters" error={errors.password} />

      <p className="auth-modal__terms">
        By signing up you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
      </p>

      {serverMessages && (
        <p className={`auth-modal__message auth-modal__message--${serverMessages.type}`}>
          {serverMessages.text}
        </p>
      )}

      <button className="auth-modal__submit" onClick={handleSubmit} disabled={loading}>
        {loading ? <><div className="auth-modal__spinner" /> Creating account…</> : "Create Account →"}
      </button>

      <div className="auth-modal__switch">
        Already have an account?
        <button onClick={onSwitch}>Log in</button>
      </div>
    </>
  );
}

/* ─────────────────────────────
   Log In screen
───────────────────────────────*/
function LogInScreen({ onSwitch, onForgot, onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverMessages, setServermessages] = useState(null);
  const validate = () => {
    const e = {};
    if (!email.includes("@")) e.email = "Enter a valid email";
    if (!password) e.password = "Password is required";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setLoading(true);

    try {
      const { data } = await api.post("/api/auth/login",
        { email, password },
      );
      setServermessages({ type: "Success", text: data.message })
      onSuccess(data.user);

    } catch (err) {
      if (!err.response) {
        setErrors({ name: "Network error. Please try again." });
        return;
      }

      const { status, data } = err.response;
      if (status === 400) setErrors({ name: data.error });
      if (status === 401) setErrors({ email: data.message });
      setServermessages({ type: "error", text: data.message });
    }
  };

  return (
    <>
      <Brand />
      <h2 className="auth-modal__title">Welcome back</h2>
      <p className="auth-modal__subtitle">Log in to continue to your workspace.</p>

      <Field label="Email" type="email" value={email} onChange={setEmail}
        placeholder="alex@example.com" error={errors.email} />

      <Field
        label="Password"
        type="password"
        value={password}
        onChange={setPassword}
        placeholder="Your password"
        error={errors.password}
      >

        {serverMessages && (
          <p className={`auth-modal__message auth-modal__message--${serverMessages.type}`}>
            {serverMessages.text}
          </p>
        )}

        <button className="auth-field__forgot" onClick={onForgot}>
          Forgot password?
        </button>
      </Field>

      <button className="auth-modal__submit" onClick={handleSubmit} disabled={loading}>
        {loading ? <><div className="auth-modal__spinner" /> Logging in…</> : "Log In →"}
      </button>

      <div className="auth-modal__switch">
        Don't have an account?
        <button onClick={onSwitch}>Sign up free</button>
      </div>
    </>
  );
}

/* ─────────────────────────────
   Forgot Password screen
───────────────────────────────*/
function ForgotScreen({ onBack }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = () => {
    if (!email.includes("@")) { setError("Enter a valid email address"); return; }
    setError("");
    setLoading(true);
    // Simulated API call — replace with real reset email trigger
    setTimeout(() => { setLoading(false); setSent(true); }, 1200);
  };

  if (sent) {
    return (
      <div className="auth-modal__success">
        <div className="auth-modal__success-icon">📬</div>
        <div className="auth-modal__success-title">Check your inbox</div>
        <p className="auth-modal__success-desc">
          We sent a password reset link to<br />
          <span className="auth-modal__success-email">{email}</span>
        </p>
        <button className="auth-modal__submit" onClick={onBack}>
          ← Back to Log In
        </button>
      </div>
    );
  }

  return (
    <>
      <Brand />
      <h2 className="auth-modal__title">Forgot password?</h2>
      <p className="auth-modal__subtitle">
        No worries. Enter your email and we'll send you a reset link.
      </p>

      <Field label="Email" type="email" value={email} onChange={v => { setEmail(v); setError(""); }}
        placeholder="alex@example.com" error={error} />

      <button className="auth-modal__submit" onClick={handleSubmit} disabled={loading}>
        {loading ? <><div className="auth-modal__spinner" /> Sending…</> : "Send Reset Link →"}
      </button>

      <div className="auth-modal__switch">
        Remember your password?
        <button onClick={onBack}>Log in</button>
      </div>
    </>
  );
}

/* ─────────────────────────────
   Root AuthModal
   mode: "signup" | "login" | "forgot"
───────────────────────────────*/
export default function AuthModal({ initialMode = "signup", onClose, onAuthSuccess }) {
  const [mode, setMode] = useState(initialMode);

  const handleSuccess = (user) => {
    onAuthSuccess(user);
    onClose();
  };

  return (
    <div className="auth-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="auth-modal">
        <button className="auth-modal__close" onClick={onClose}>✕</button>

        {mode === "signup" && (
          <SignUpScreen
            onSwitch={() => setMode("login")}
            onSuccess={handleSuccess}
            onClose={onClose}
          />
        )}

        {mode === "login" && (
          <LogInScreen
            onSwitch={() => setMode("signup")}
            onForgot={() => setMode("forgot")}
            onSuccess={handleSuccess}
          />
        )}

        {mode === "forgot" && (
          <ForgotScreen onBack={() => setMode("login")} />
        )}
      </div>
    </div>
  );
}