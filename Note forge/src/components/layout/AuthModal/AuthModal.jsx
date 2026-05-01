import { useState, useEffect } from "react"; // ← Fixed import
import api from "../api";
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
function Field({
  label,
  type = "text",
  value,
  onChange,
  error,
  placeholder,
  children,
}) {
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
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={
          type === "password"
            ? "current-password"
            : type === "email"
              ? "email"
              : "off"
        }
      />
      {error && <div className="auth-field__error">⚠ {error}</div>}
    </div>
  );
}
//--------sign up screen------
function SignUpScreen({ onSwitch, onVerify }) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = "Name required";
    if (!username.trim()) e.username = "Username required";
    if (!email.includes("@")) e.email = "Invalid email";
    if (password.length < 8) e.password = "Min 8 characters";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      await api.post("/api/auth/register", {
        name,
        username,
        email,
        password,
      });

      // 👉 Move to OTP screen
      onVerify(email);
    } catch (err) {
      setLoading(false);
      setMessage(err.response?.data?.message || "Signup failed");
    }
  };

  return (
    <>
      <Brand />
      <h2 className="auth-modal__title">Create account</h2>

      <Field label="Name" value={name} onChange={setName} error={errors.name} />
      <Field
        label="Username"
        value={username}
        onChange={setUsername}
        error={errors.username}
      />
      <Field
        label="Email"
        value={email}
        onChange={setEmail}
        error={errors.email}
      />
      <Field
        label="Password"
        type="password"
        value={password}
        onChange={setPassword}
        error={errors.password}
      />

      {message && <p className="auth-modal__message">{message}</p>}

      <button
        className="auth-modal__submit"
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? "Creating..." : "Create Account →"}
      </button>

      <div className="auth-modal__switch">
        Already have an account?
        <button onClick={onSwitch}>Login</button>
      </div>
    </>
  );
}

//--------verification screen---------

function VerifyCodeScreen({ email, onSuccess, onBack }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleVerify = async () => {
    if (!code) {
      setMessage("Enter code");
      return;
    }

    setLoading(true);

    try {
      await api.post("/api/auth/verify-code", { email, code });

      setMessage("Email verified!");

      setTimeout(() => onSuccess(), 800);
    } catch (err) {
      setLoading(false);
      setMessage(err.response?.data?.message || "Invalid code");
    }
  };

  const handleResend = async () => {
    try {
      await api.post("/api/auth/resend-code", { email });
      setMessage("Code sent again");
    } catch {
      setMessage("Failed to resend");
    }
  };

  return (
    <>
      <Brand />
      <h2 className="auth-modal__title">Verify Email</h2>
      <p className="auth-modal__subtitle">
        Code sent to <b>{email}</b>
      </p>

      <Field
        label="Verification Code"
        value={code}
        onChange={setCode}
        placeholder="123456"
      />

      {message && <p className="auth-modal__message">{message}</p>}

      <button
        className="auth-modal__submit"
        onClick={handleVerify}
        disabled={loading}
      >
        {loading ? "Verifying..." : "Verify →"}
      </button>

      <button onClick={handleResend} className="auth-link">
        Resend Code
      </button>

      <button onClick={onBack} className="auth-link">
        ← Back
      </button>
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
  const [serverMessage, setServerMessage] = useState(null);

  const validate = () => {
    const e = {};
    if (!email.includes("@")) e.email = "Enter a valid email";
    if (!password) e.password = "Password is required";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }

    setErrors({});
    setLoading(true);
    setServerMessage(null);

    try {
      const { data } = await api.post("/api/auth/login", {
        email,
        password,
      });

      // 🔥 Handle MFA required
      if (data.mfaRequired) {
        onSuccess({ mfaRequired: true, userId: data.userId });
        return;
      }

      // 🔥 Handle MFA setup
      if (data.setupMfa) {
        onSuccess({ setupMfa: true, userId: data.userId });
        return;
      }

      // ✅ Normal successful login
      setServerMessage({ type: "success", text: data.message });

      // ✅ Cookie is set automatically by backend
      // No need to store token in localStorage

      setTimeout(() => onSuccess(data.user), 500);
    } catch (err) {
      setLoading(false);

      if (!err.response) {
        setServerMessage({
          type: "error",
          text: "Network error. Please try again.",
        });
        return;
      }

      const { status, data } = err.response;

      if (status === 401) {
        setErrors({ password: data.message });
        setServerMessage({ type: "error", text: data.message });
      } else {
        setServerMessage({
          type: "error",
          text: "Something went wrong. Please try again.",
        });
      }
    }
  };

  return (
    <>
      <Brand />
      <h2 className="auth-modal__title">Welcome back</h2>
      <p className="auth-modal__subtitle">
        Log in to continue to your workspace.
      </p>

      <Field
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="alex@example.com"
        error={errors.email}
      />

      <Field
        label="Password"
        type="password"
        value={password}
        onChange={setPassword}
        placeholder="Your password"
        error={errors.password}
      >
        <button className="auth-field__forgot" onClick={onForgot}>
          Forgot password?
        </button>
      </Field>

      {serverMessage && (
        <p
          className={`auth-modal__message auth-modal__message--${serverMessage.type}`}
        >
          {serverMessage.text}
        </p>
      )}

      <button
        className="auth-modal__submit"
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <>
            <div className="auth-modal__spinner" /> Logging in…
          </>
        ) : (
          "Log In →"
        )}
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
  const [step, setStep] = useState(1); // 1=email, 2=otp, 3=success

  const [email, setEmail] = useState("");
  const [otp, setOTP] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // STEP 1 → SEND OTP
  const handleSendOTP = async () => {
    if (!email.includes("@")) {
      return setError("Enter a valid email");
    }

    try {
      setLoading(true);
      setError("");

      await api.post("/api/auth/forgot-password", { email });

      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // STEP 2 → RESET PASSWORD
  const handleResetPassword = async () => {
    if (!otp || password.length < 6) {
      return setError("Enter valid OTP and password (min 6 chars)");
    }

    try {
      setLoading(true);
      setError("");

      await api.post("/api/auth/reset-password", {
        email,
        otp,
        newPassword: password,
      });

      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  // STEP 3 → SUCCESS
  if (step === 3) {
    return (
      <div className="auth-modal__success">
        <div className="auth-modal__success-icon">✅</div>
        <div className="auth-modal__success-title">
          Password Reset Successful
        </div>
        <p className="auth-modal__success-desc">
          You can now log in with your new password.
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

      {step === 1 && (
        <>
          <h2 className="auth-modal__title">Forgot password?</h2>
          <p className="auth-modal__subtitle">
            Enter your email to receive a verification code.
          </p>

          <Field
            label="Email"
            type="email"
            value={email}
            onChange={(v) => {
              setEmail(v);
              setError("");
            }}
            placeholder="alex@example.com"
            error={error}
          />

          <button
            className="auth-modal__submit"
            onClick={handleSendOTP}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="auth-modal__spinner" /> Sending…
              </>
            ) : (
              "Send OTP →"
            )}
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <h2 className="auth-modal__title">Verify OTP</h2>
          <p className="auth-modal__subtitle">
            Enter the OTP sent to <b>{email}</b>
          </p>

          <Field
            label="OTP"
            type="text"
            value={otp}
            onChange={(v) => {
              setOTP(v);
              setError("");
            }}
            placeholder="Enter 6-digit OTP"
            error={error}
          />

          <Field
            label="New Password"
            type="password"
            value={password}
            onChange={(v) => {
              setPassword(v);
              setError("");
            }}
            placeholder="Enter new password"
          />

          <button
            className="auth-modal__submit"
            onClick={handleResetPassword}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="auth-modal__spinner" /> Resetting…
              </>
            ) : (
              "Reset Password →"
            )}
          </button>

          <div className="auth-modal__switch">
            Didn’t receive OTP?
            <button onClick={handleSendOTP}>Resend</button>
          </div>
        </>
      )}

      <div className="auth-modal__switch">
        Remember your password?
        <button onClick={onBack}>Log in</button>
      </div>
    </>
  );
}

/* ─────────────────────────────
   MFA Verification screen
───────────────────────────────*/
function MfaScreen({ userId, onSuccess }) {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    // Clean the input
    const cleanOtp = otp.trim().replace(/\s+/g, "").replace(/-/g, "");

    if (cleanOtp.length !== 6) {
      setError("Enter 6-digit code");
      return;
    }

    if (!/^\d{6}$/.test(cleanOtp)) {
      setError("Code must be 6 digits");
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log("🔐 Verifying MFA...");
      console.log("📤 Sending userId:", userId);
      console.log("📤 Sending OTP:", cleanOtp);

      const { data } = await api.post("/api/auth/verify-mfa", {
        userId,
        otp: cleanOtp,
      });

      console.log("✅ MFA verification successful:", data);

      // ✅ Cookie is set automatically by backend
      onSuccess(data.user);
    } catch (err) {
      setLoading(false);

      console.error("❌ MFA verification failed:", err);
      console.error("❌ Error response:", err.response?.data);

      if (err.response?.status === 401) {
        setError("Invalid OTP code. Please check your authenticator app.");
      } else if (err.response?.status === 400) {
        setError(err.response?.data?.message || "Bad request");
      } else if (err.response?.status === 404) {
        setError("User not found. Please try logging in again.");
      } else {
        setError("Verification failed. Please try again.");
      }
    }
  };

  // Allow Enter key to submit
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && otp.length === 6) {
      handleVerify();
    }
  };

  return (
    <>
      <Brand />
      <h2 className="auth-modal__title">Verify Admin Access</h2>
      <p className="auth-modal__subtitle">
        Enter the 6-digit code from your authenticator app
      </p>

      <Field
        label="Authentication Code"
        value={otp}
        onChange={(val) => {
          setOtp(val);
          setError(""); // Clear error when user types
        }}
        placeholder="123456"
        error={error}
      />

      <p
        style={{
          fontSize: "12px",
          color: "#666",
          marginTop: "-8px",
          marginBottom: "16px",
        }}
      >
        The code refreshes every 30 seconds
      </p>

      <button
        className="auth-modal__submit"
        onClick={handleVerify}
        disabled={loading}
      >
        {loading ? (
          <>
            <div className="auth-modal__spinner" /> Verifying…
          </>
        ) : (
          "Verify →"
        )}
      </button>
    </>
  );
}

/* ─────────────────────────────
   MFA Setup screen
───────────────────────────────*/
function SetupMfaScreen({ userId, onSuccess }) {
  const [qrCode, setQrCode] = useState(null);
  const [manualSecret, setManualSecret] = useState(null);
  const [showManual, setShowManual] = useState(false);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("loading");

  useEffect(() => {
    async function fetchQR() {
      try {
        console.log("🔧 Fetching QR code for userId:", userId);
        const { data } = await api.post("/api/auth/setup-mfa", { userId });
        console.log("✅ QR code received");
        setQrCode(data.qr);
        setManualSecret(data.manualEntry || data.secret);
        setStep("scan");
      } catch (err) {
        console.error("❌ MFA setup error:", err);
        setError("Failed to setup MFA. Please try again.");
        setStep("error");
      }
    }
    if (!qrCode) {
      fetchQR();
    }
  }, [userId]);

  const handleVerify = async () => {
    const cleanOtp = otp.trim().replace(/\s+/g, "").replace(/-/g, "");

    if (cleanOtp.length !== 6) {
      setError("Enter 6-digit code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log("🔐 Verifying setup with OTP...");
      const { data } = await api.post("/api/auth/verify-mfa", {
        userId,
        otp: cleanOtp,
      });

      console.log("✅ Setup verification successful");
      onSuccess(data.user);
    } catch (err) {
      setLoading(false);
      console.error("❌ Setup verification failed:", err);

      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError(
          "Invalid code. Make sure you're entering the current code from your app.",
        );
      }
    }
  };

  if (step === "loading") {
    return (
      <>
        <Brand />
        <h2 className="auth-modal__title">Setting up MFA...</h2>
        <div style={{ textAlign: "center", padding: "40px" }}>
          <div className="auth-modal__spinner" />
        </div>
      </>
    );
  }

  if (step === "error") {
    return (
      <>
        <Brand />
        <h2 className="auth-modal__title">Setup Failed</h2>
        <p className="auth-modal__subtitle" style={{ color: "#d32f2f" }}>
          {error}
        </p>
        <button
          className="auth-modal__submit"
          onClick={() => window.location.reload()}
        >
          Try Again
        </button>
      </>
    );
  }

  return (
    <>
      <Brand />
      <h2 className="auth-modal__title">Setup Two-Factor Authentication</h2>

      {!showManual ? (
        <>
          <p className="auth-modal__subtitle">
            Scan this QR code with your authenticator app
          </p>

          {qrCode && (
            <div
              style={{
                textAlign: "center",
                margin: "20px 0",
                padding: "20px",
                backgroundColor: "#f5f5f5",
                borderRadius: "8px",
              }}
            >
              <img
                src={qrCode}
                alt="MFA QR Code"
                style={{ maxWidth: "200px", border: "4px solid white" }}
              />
            </div>
          )}

          <button
            onClick={() => setShowManual(true)}
            style={{
              background: "none",
              border: "none",
              color: "#4F46E5",
              cursor: "pointer",
              textDecoration: "underline",
              marginBottom: "16px",
            }}
          >
            Can't scan? Enter code manually
          </button>
        </>
      ) : (
        <>
          <p className="auth-modal__subtitle">
            Enter this code manually in your authenticator app
          </p>

          <div
            style={{
              padding: "16px",
              backgroundColor: "#f5f5f5",
              borderRadius: "8px",
              marginBottom: "16px",
              fontFamily: "monospace",
              fontSize: "14px",
              wordBreak: "break-all",
            }}
          >
            {manualSecret}
          </div>

          <button
            onClick={() => setShowManual(false)}
            style={{
              background: "none",
              border: "none",
              color: "#4F46E5",
              cursor: "pointer",
              textDecoration: "underline",
              marginBottom: "16px",
            }}
          >
            ← Back to QR code
          </button>
        </>
      )}

      <p style={{ fontSize: "13px", color: "#666", marginBottom: "16px" }}>
        After setup, enter the 6-digit code from your app
      </p>

      <Field
        label="Verification Code"
        value={otp}
        onChange={(val) => {
          setOtp(val);
          setError("");
        }}
        placeholder="123456"
        error={error}
      />

      <button
        className="auth-modal__submit"
        onClick={handleVerify}
        disabled={loading || !qrCode}
      >
        {loading ? (
          <>
            <div className="auth-modal__spinner" /> Verifying…
          </>
        ) : (
          "Verify & Complete Setup →"
        )}
      </button>
    </>
  );
}
/* ─────────────────────────────
   Root AuthModal
───────────────────────────────*/
export default function AuthModal({
  initialMode = "signup",
  onClose,
  onAuthSuccess,
}) {
  const [mode, setMode] = useState(initialMode);
  const [mfaUserId, setMfaUserId] = useState(null);
  const [verifyEmail, setVerifyEmail] = useState("");

  const handleSuccess = (data) => {
    // 🔥 Handle MFA required
    if (data?.mfaRequired) {
      setMfaUserId(data.userId);
      setMode("mfa");
      return;
    }

    // 🔥 Handle MFA setup
    if (data?.setupMfa) {
      setMfaUserId(data.userId);
      setMode("setupMfa");
      return;
    }

    // ✅ Normal success
    onAuthSuccess(data);
    onClose();
  };

  return (
    <div
      className="auth-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="auth-modal">
        <button className="auth-modal__close" onClick={onClose}>
          ✕
        </button>

        {/* SIGNUP */}
        {mode === "signup" && (
          <SignUpScreen
            onSwitch={() => setMode("login")}
            onVerify={(email) => {
              setVerifyEmail(email);
              setMode("verify");
            }}
          />
        )}
        {/* VERIFY EMAIL (OTP) */}
        {mode === "verify" && (
          <VerifyCodeScreen
            email={verifyEmail}
            onSuccess={() => setMode("login")}
            onBack={() => setMode("signup")}
          />
        )}

        {mode === "login" && (
          <LogInScreen
            onSwitch={() => setMode("signup")}
            onForgot={() => setMode("forgot")}
            onSuccess={handleSuccess}
          />
        )}

        {mode === "forgot" && <ForgotScreen onBack={() => setMode("login")} />}

        {mode === "mfa" && (
          <MfaScreen userId={mfaUserId} onSuccess={handleSuccess} />
        )}

        {mode === "setupMfa" && (
          <SetupMfaScreen userId={mfaUserId} onSuccess={handleSuccess} />
        )}
      </div>
    </div>
  );
}
