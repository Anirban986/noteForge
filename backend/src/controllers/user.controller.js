const userService = require("../services/user.services");

// ================= REGISTER =================
async function registerUser(req, res) {
  try {
    const result = await userService.registerUserService(req.body);

    res.status(201).json({
      message: "User registered. Verification code sent to email.",
      user: result.newUser,
    });
  } catch (error) {
    if (error.message === "All_fields_are_required") {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (error.message === "Username_or_email_already_exists") {
      return res.status(409).json({
        message: "Username or email already exists",
      });
    }

    if (error.message === "Password_must_be_string") {
      return res.status(400).json({
        message: "Password must be a string",
      });
    }

    if (error.message === "Email_send_failed") {
      return res.status(500).json({
        message: "Failed to send verification email",
      });
    }

    console.error("Registration error:", error);
    res.status(500).json({
      message: "Server error during registration",
      error: error.message,
    });
  }
}


// ================= VERIFY OTP =================
async function verifyCode(req, res) {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        message: "Email and code are required",
      });
    }

    await userService.verifyCodeService(email, code);

    res.json({
      message: "Email verified successfully. You can now login.",
    });
  } catch (error) {
    if (error.message === "User_not_found") {
      return res.status(404).json({ message: "User not found" });
    }

    if (error.message === "Already_verified") {
      return res.status(400).json({ message: "Email already verified" });
    }

    if (error.message === "Invalid_code") {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    if (error.message === "Code_expired") {
      return res.status(400).json({ message: "Verification code expired" });
    }

    console.error("Verification error:", error);
    res.status(500).json({
      message: "Verification failed",
      error: error.message,
    });
  }
}

// ================= RESEND OTP =================
async function resendVerification(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    await userService.resendVerificationService(email);

    res.json({
      message: "Verification code sent again to your email",
    });
  } catch (error) {
    if (error.message === "User_not_found") {
      return res.status(404).json({ message: "User not found" });
    }

    if (error.message === "Already_verified") {
      return res.status(400).json({ message: "Email already verified" });
    }

    if (error.message === "Email_send_failed") {
      return res.status(500).json({
        message: "Failed to send verification email",
      });
    }

    console.error("Resend error:", error);
    res.status(500).json({
      message: "Error resending verification code",
      error: error.message,
    });
  }
}

// ================= LOGIN =================
async function loginUser(req, res) {
  try {
    const result = await userService.loginUserService(req.body);

    // 🔐 MFA required
    if (result.status === "MFA_REQUIRED") {
      return res.json({
        mfaRequired: true,
        userId: result.userId,
      });
    }

    // 🔐 Setup MFA
    if (result.status === "SETUP_MFA") {
      return res.json({
        setupMfa: true,
        userId: result.userId,
      });
    }

    // ✅ Success
    if (result.status === "SUCCESS") {
      res.cookie("token", result.token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });

      return res.json({
        message: "Login successful",
        user: result.user,
      });
    }
  } catch (error) {
    if (error.message === "Invalid_email_or_password") {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    if (error.message === "Email_not_verified") {
      return res.status(403).json({
        message: "Please verify your email first",
      });
    }

    console.error("Login error:", error);
    res.status(500).json({
      message: "Server error during login",
      error: error.message,
    });
  }
}

async function logoutUser(req, res) {
  res.clearCookie("token");
  res.status(200).json({
    message: "User logged out successfully",
  });
}

async function userProfile(req, res) {
  try {
    const userId = req.user.id;
    const user = await userService.userProfileService(userId);

    res.status(200).json({ user });
  } catch (error) {
    if (error.message === "User_not_found") {
      return res.status(404).json({
        message: "User not found",
      });
    }

    console.error("Profile error:", error);
    res.status(500).json({
      message: "Server error fetching profile",
      error: error.message,
    });
  }
}

async function upgradePlanController(req, res) {
  try {
    const result = await userService.upgradePlanService(req.user.id);

    return res.json({
      message: "Upgraded to premium successfully",
      ...result,
    });
  } catch (error) {
    if (error.message === "USER_NOT_FOUND") {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (error.message === "ALREADY_PREMIUM") {
      return res.status(400).json({
        message: "Already a premium user",
      });
    }

    console.error("Upgrade error:", error);
    return res.status(500).json({
      message: "Server error during upgrade",
      error: error.message,
    });
  }
}

async function getCurrentUserController(req, res) {
  try {
    const userId = req.user.id;
    const user = await userService.getCurrentUser(userId);

    res.json({ user });
  } catch (error) {
    if (error.message === "USER_NOT_FOUND") {
      return res.status(404).json({
        message: "User not found",
      });
    }

    console.error("Get current user error:", error);
    res.status(500).json({
      message: "Server error fetching user",
      error: error.message,
    });
  }
}

// 🔥🔥🔥 For admin only 🔥🔥🔥

async function setupMfaController(req, res) {
  try {
    // Accept userId from body OR from authenticated session
    const userId = req.body.userId || req.user?.id;

    if (!userId) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    console.log("🔧 Setting up MFA for user:", userId);
    const data = await userService.setupMfaService(userId);

    res.json({
      message: "MFA setup successful",
      qr: data.qr,
    });
  } catch (error) {
    if (error.message === "USER_NOT_FOUND") {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (error.message === "ADMIN_ONLY") {
      return res.status(403).json({
        message: "MFA is only available for admin users",
      });
    }

    console.error("MFA setup error:", error);
    res.status(500).json({
      message: "Server error setting up MFA",
      error: error.message,
    });
  }
}

async function verifyMfaController(req, res) {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📥 VERIFY-MFA ENDPOINT HIT");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    const { userId, otp } = req.body;

    console.log("📦 Request Body:", req.body);
    console.log("📦 UserId Type:", typeof userId);
    console.log("📦 UserId Value:", userId);
    console.log("📦 OTP Type:", typeof otp);
    console.log("📦 OTP Value:", otp);

    if (!userId || !otp) {
      console.log("❌ Missing userId or OTP");
      return res.status(400).json({
        message: "User ID and OTP are required",
        received: { userId: !!userId, otp: !!otp },
      });
    }

    console.log("✅ Validation passed, calling service...");
    const result = await userService.verifyMfaService(userId, otp);
    console.log("✅ Service returned successfully");

    // ✅ Set cookie after successful MFA verification
    res.cookie("token", result.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    console.log("✅ Cookie set successfully");
    console.log("✅ Sending success response");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    res.json({
      message: "Admin verified successfully",
      user: result.user,
    });
  } catch (error) {
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("❌ ERROR IN VERIFY-MFA CONTROLLER");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("Error Name:", error.name);
    console.error("Error Message:", error.message);
    console.error("Error Stack:", error.stack);
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    if (error.message === "USER_NOT_FOUND") {
      return res.status(404).json({
        message: "User not found",
        error: error.message,
      });
    }

    if (error.message === "MFA_NOT_SETUP") {
      return res.status(400).json({
        message: "MFA is not set up for this user",
        error: error.message,
      });
    }

    if (error.message === "INVALID_OTP") {
      return res.status(401).json({
        message: "Invalid OTP code. Please try again.",
        error: error.message,
      });
    }

    console.error("Unexpected error in MFA verification:", error);
    res.status(500).json({
      message: "Server error verifying MFA",
      error: error.message,
      type: error.name,
    });
  }
}

async function resetMfaController(req, res) {
  try {
    const { userId } = req.body;
    const User = require("../models/user.model");

    await User.findByIdAndUpdate(userId, {
      mfaEnabled: false,
      mfaSecret: null,
    });

    res.json({ message: "MFA reset successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  userProfile,
  upgradePlanController,
  getCurrentUserController,
  setupMfaController,
  verifyMfaController,
  resetMfaController,
  verifyCode,
  resendVerification,
};
