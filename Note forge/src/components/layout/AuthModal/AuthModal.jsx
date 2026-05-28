import { useState, useEffect } from "react";
import api from "../api";
import "./AuthModal.css";
import  { setAuthSession } from "../api";

/* ─────────────────────────────
   BRAND
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
   FIELD
───────────────────────────────*/
function Field({ label, value, onChange, type = "text", error, placeholder }) {
  return (
    <div className="auth-field">
      <label className="auth-field__label">{label}</label>

      <input
        className={`auth-field__input ${error ? "auth-field__input--error" : ""}`}
        value={value}
        type={type}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />

      {error && <div className="auth-field__error">⚠ {error}</div>}
    </div>
  );
}

/* ─────────────────────────────
   SIGNUP
───────────────────────────────*/
function SignUpScreen({ onNext, onSwitch }) {
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const update = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    setError("");

    if (!form.email.includes("@")) return setError("Invalid email");
    if (form.password.length < 8) return setError("Min 8 characters");

    try {
      setLoading(true);

      await api.post("/api/auth/register", form);

      onNext(form.email);
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Brand />
      <h2>Create account</h2>

      <Field label="Name" value={form.name} onChange={(v) => update("name", v)} />
      <Field label="Username" value={form.username} onChange={(v) => update("username", v)} />
      <Field label="Email" value={form.email} onChange={(v) => update("email", v)} />
      <Field
        label="Password"
        type="password"
        value={form.password}
        onChange={(v) => update("password", v)}
      />

      {error && <p className="auth-modal__message">{error}</p>}

      <button className="auth-modal__submit" onClick={handleSubmit} disabled={loading}>
        {loading ? "Creating..." : "Create Account"}
      </button>

      <p className="auth-modal__switch">
        Already have an account?
        <button onClick={onSwitch}>Login</button>
      </p>
    </>
  );
}

/* ─────────────────────────────
   VERIFY EMAIL
───────────────────────────────*/
function VerifyScreen({ email, onDone, onBack }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const handleVerify = async () => {
    try {
      await api.post("/api/auth/verify-code", { email, code });
      onDone();
    } catch (err) {
      setError(err.response?.data?.message || "Invalid code");
    }
  };

  return (
    <>
      <Brand />
      <h2>Verify Email</h2>
      <p>Sent to {email}</p>

      <Field label="Code" value={code} onChange={setCode} />

      {error && <p className="auth-modal__message">{error}</p>}

      <button className="auth-modal__submit" onClick={handleVerify}>
        Verify
      </button>

      <button className="auth-link" onClick={onBack}>
        Back
      </button>
    </>
  );
}

/* ─────────────────────────────
   LOGIN
───────────────────────────────*/
function LoginScreen({ onSuccess, onSwitch, onForgot }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

 const handleLogin = async () => {
  setError("");
  try {
    setLoading(true);
    const { data } = await api.post("/api/auth/login", { email, password });

    if (data.status === "MFA_REQUIRED") {
      onSuccess({ type: "MFA_REQUIRED", userId: data.userId });
      return;
    }

    if (data.status === "SETUP_MFA") {
      onSuccess({ type: "SETUP_MFA", userId: data.userId });
      return;
    }

    if (data.status === "SUCCESS") {
      setAuthSession({ token: data.token, user: data.user });
      onSuccess({ type: "SUCCESS", user: data.user });
      return;
    }

    setError("Unexpected response from server. Please try again.");
  } catch (err) {
    setError(err.userMessage || err.response?.data?.message || "Login failed");
  } finally {
    setLoading(false);
  }
};

  return (
    <>
      <Brand />
      <h2>Welcome back</h2>

      <Field label="Email" value={email} onChange={setEmail} />
      <Field label="Password" type="password" value={password} onChange={setPassword} />

      {error && <p className="auth-modal__message">{error}</p>}

      <button className="auth-modal__submit" onClick={handleLogin} disabled={loading}>
        {loading ? "Logging in..." : "Login"}
      </button>

      <p className="auth-modal__switch">
        No account?
        <button onClick={onSwitch}>Sign up</button>
      </p>

      <button className="auth-field__forgot" onClick={onForgot}>
        Forgot password?
      </button>
    </>
  );
}

/* ─────────────────────────────
   MFA VERIFY
───────────────────────────────*/
function MfaScreen({ userId, onSuccess }) {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const verify = async () => {
    setError("");
    try {
      setLoading(true);
      const { data } = await api.post("/api/auth/verify-mfa", {
        userId,
        otp: otp.replace(/\s/g, ""),
      });
      setAuthSession({ token: data.token, user: data.user });
      onSuccess({ type: "SUCCESS", user: data.user });
    } catch (err) {
      setError(err.userMessage || err.response?.data?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Brand />
      <h2>MFA Verification</h2>
      <Field label="OTP Code" value={otp} onChange={setOtp} />
      {error && <p className="auth-modal__message">{error}</p>}
      <button className="auth-modal__submit" onClick={verify} disabled={loading}>
        {loading ? "Verifying…" : "Verify"}
      </button>
    </>
  );
}

/* ─────────────────────────────
   MFA SETUP
───────────────────────────────*/
function SetupMfaScreen({ userId, onSuccess }) {
  const [qr, setQr] = useState(null);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data } = await api.post("/api/auth/setup-mfa", { userId });
        if (!cancelled) setQr(data.qr);
      } catch {
        if (!cancelled) setError("Failed to load MFA setup");
      }
    };
    load();
    return () => { cancelled = true; };
  }, [userId]);

  const verify = async () => {
    setError("");
    try {
      setLoading(true);
      const { data } = await api.post("/api/auth/verify-mfa", { userId, otp });
      setAuthSession({ token: data.token, user: data.user });
      onSuccess({ type: "SUCCESS", user: data.user });
    } catch (err) {
      setError(err.userMessage || err.response?.data?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Brand />
      <h2>Setup MFA</h2>
      <p>Scan the QR code with your authenticator app, then enter the code below.</p>
      {qr ? <img src={qr} alt="MFA QR Code" /> : !error && <p>Loading QR code…</p>}
      <Field label="OTP" value={otp} onChange={setOtp} />
      {error && <p className="auth-modal__message">{error}</p>}
      <button className="auth-modal__submit" onClick={verify} disabled={loading || !qr}>
        {loading ? "Verifying…" : "Complete Setup"}
      </button>
    </>
  );
}


/* ─────────────────────────────
   ROOT MODAL
───────────────────────────────*/
export default function AuthModal({ onClose, onAuthSuccess }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [mfaUserId, setMfaUserId] = useState(null);

  const handleAuth = (res) => {
    if (res.type === "MFA_REQUIRED") {
      setMfaUserId(res.userId);
      setMode("mfa");
      return;
    }

    if (res.type === "SETUP_MFA") {
      setMfaUserId(res.userId);
      setMode("setup");
      return;
    }

    if (res.type === "SUCCESS") {
      onAuthSuccess(res.user);
      onClose();
    }
  };

  return (
    <div className="auth-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="auth-modal">
        <button onClick={onClose} className="auth-modal__close">
          ✕
        </button>

        {mode === "signup" && (
          <SignUpScreen
            onSwitch={() => setMode("login")}
            onNext={(email) => {
              setEmail(email);
              setMode("verify");
            }}
          />
        )}

        {mode === "verify" && (
          <VerifyScreen
            email={email}
            onDone={() => setMode("login")}
            onBack={() => setMode("signup")}
          />
        )}

        {mode === "login" && (
          <LoginScreen
            onSwitch={() => setMode("signup")}
            onForgot={() => setMode("forgot")}
            onSuccess={handleAuth}
          />
        )}

        {mode === "mfa" && (
          <MfaScreen userId={mfaUserId} onSuccess={handleAuth} />
        )}

        {mode === "setup" && (
          <SetupMfaScreen userId={mfaUserId} onSuccess={handleAuth} />
        )}
      </div>
    </div>
  );
}