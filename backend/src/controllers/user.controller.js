const userService = require("../services/user.services");

// ================= REGISTER =================
async function registerUser(req, res) {
  try {
    const result = await userService.registerUserService(req.body);

    res.status(201).json({
      message: "User registered. Verification code sent.",
      user: result.newUser,
    });
  } catch (error) {
    const map = {
      All_fields_are_required: 400,
      Username_or_email_already_exists: 409,
      Email_send_failed: 500,
    };

    return res.status(map[error.message] || 500).json({
      message: error.message.replace(/_/g, " "),
    });
  }
}

// ================= VERIFY EMAIL =================
/**
 * Service now returns { token, user } so the frontend can call setAuthSession
 * immediately after verification, skipping the extra login step.
 */
async function verifyCode(req, res) {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ message: "Email and code required" });
    }

    const { token, user } = await userService.verifyCodeService(email, code);

    return res.json({ message: "Email verified successfully", token, user });
  } catch (error) {
    const map = {
      User_not_found: 404,
      Already_verified: 400,
      Invalid_code: 400,
      Code_expired: 400,
    };

    return res.status(map[error.message] || 500).json({
      message: error.message.replace(/_/g, " "),
    });
  }
}

// ================= RESEND OTP =================
async function resendVerification(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }

    await userService.resendVerificationService(email);

    return res.json({ message: "Verification code sent" });
  } catch (error) {
    const map = {
      User_not_found: 404,
      Already_verified: 400,
    };

    return res.status(map[error.message] || 500).json({
      message: error.message.replace(/_/g, " "),
    });
  }
}

// ================= LOGIN =================
/**
 * Bearer-token only. The cookie that was here previously created a dual-auth
 * situation where the frontend (Vercel) and backend (Render) were on different
 * origins, so the cookie would be blocked by SameSite rules in production
 * anyway. The Authorization header works cross-origin without any extra config.
 */
async function loginUser(req, res) {
  try {
    const result = await userService.loginUserService(req.body);

    if (result.status === "MFA_REQUIRED") {
      return res.status(200).json({
        status: "MFA_REQUIRED",
        userId: result.userId,
      });
    }

    if (result.status === "SETUP_MFA") {
      return res.status(200).json({
        status: "SETUP_MFA",
        userId: result.userId,
      });
    }

    if (result.status === "SUCCESS") {
      return res.status(200).json({
        status: "SUCCESS",
        token: result.token,
        user: result.user,
      });
    }

    return res.status(500).json({
      status: "ERROR",
      message: "Invalid login flow state",
    });
  } catch (error) {
    const map = {
      Invalid_email_or_password: 401,
      Email_not_verified: 403,
    };

    return res.status(map[error.message] || 500).json({
      status: "ERROR",
      message: error.message.replace(/_/g, " "),
    });
  }
}

// ================= FORGOT PASSWORD =================
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    const result = await userService.forgotPassword(email);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

// ================= RESET PASSWORD =================
async function resetPassword(req, res) {
  try {
    const { email, otp, newPassword } = req.body;
    const result = await userService.resetPassword(email, otp, newPassword);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

// ================= USER PROFILE =================
async function userProfile(req, res) {
  try {
    const user = await userService.userProfileService(req.user.id);
    return res.json({ user });
  } catch (error) {
    return res.status(404).json({ message: error.message });
  }
}

// ================= MFA SETUP =================
async function setupMfaController(req, res) {
  try {
    // req.user is set by userMiddleware (JWT verified). userId from body is the
    // pre-auth fallback used during the setup-MFA flow where no token exists yet.
    const userId = req.body.userId || req.user?.id;

    if (!userId) {
      return res.status(400).json({ message: "userId required" });
    }

    const data = await userService.setupMfaService(userId);

    return res.json({ qr: data.qr, secret: data.secret, manualEntry: data.manualEntry });
  } catch (error) {
    const map = {
      USER_NOT_FOUND: 404,
      ADMIN_ONLY: 403,
    };

    return res.status(map[error.message] || 500).json({
      message: error.message,
    });
  }
}

// ================= VERIFY MFA =================
/**
 * Bearer-only response — cookie removed for the same cross-origin reason
 * as loginUser above.
 */
async function verifyMfaController(req, res) {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({ message: "userId and otp required" });
    }

    const result = await userService.verifyMfaService(userId, otp);

    return res.json({
      status: "SUCCESS",
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    const map = {
      USER_NOT_FOUND: 404,
      MFA_NOT_SETUP: 400,
      INVALID_OTP: 401,
    };

    return res.status(map[error.message] || 500).json({
      message: error.message,
    });
  }
}

// ================= LOGOUT =================
/**
 * With Bearer tokens, logout is handled client-side (clearAuthSession in api.js).
 * This endpoint exists as a convenience hook for future server-side token
 * revocation (e.g. a blocklist) without requiring a frontend change.
 */
async function logoutUser(req, res) {
  return res.json({ message: "Logged out" });
}

// ================= UPGRADE PLAN =================
async function upgradePlanController(req, res) {
  try {
    const result = await userService.upgradePlanService(req.user.id);

    return res.json({ message: "Plan upgraded successfully", user: result });
  } catch (error) {
    const map = {
      USER_NOT_FOUND: 404,
      ALREADY_PREMIUM: 400,
    };

    return res.status(map[error.message] || 500).json({
      message:
        error.message === "ALREADY_PREMIUM"
          ? "User already has premium plan"
          : error.message === "USER_NOT_FOUND"
          ? "User not found"
          : "Server error upgrading plan",
    });
  }
}

// ================= GET CURRENT USER =================
async function getCurrentUserController(req, res) {
  try {
    const user = await userService.getCurrentUserService(req.user.id);
    return res.json({ user });
  } catch (error) {
    return res.status(error.message === "USER_NOT_FOUND" ? 404 : 500).json({
      message:
        error.message === "USER_NOT_FOUND" ? "User not found" : "Server error fetching user",
    });
  }
}

// ================= EXPORTS =================
module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  userProfile,
  setupMfaController,
  verifyMfaController,
  verifyCode,
  resendVerification,
  forgotPassword,
  resetPassword,
  upgradePlanController,
  getCurrentUserController,
};