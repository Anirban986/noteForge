const userRepository = require("../repositories/user.repository");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const QRCode = require("qrcode");
const speakeasy = require("speakeasy");
const User = require("../models/user.model");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const { generateforgotPasswordOTP } = require("../utils/otp");
const { sendForgotPasswordOTP } = require("../utils/mailer");

dotenv.config();
// Email setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS,
  },
});


// ================= HELPER =================
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

//=================== EMAIL =================
async function sendOTPEmail(email, code) {
  await transporter.sendMail({
    to: email,
    subject: "Verify your email",
    html: `
      <div style="font-family:sans-serif;text-align:center;">
        <h2>Email Verification</h2>
        <p>Your verification code is:</p>
        <h1 style="letter-spacing:5px;color:#4CAF50;">${code}</h1>
        <p>This code will expire in 10 minutes.</p>
      </div>
    `,
  });
}

async function registerUserService(userData) {
  const { name, username, email, password } = userData;

  if (!name || !username || !email || !password) {
    throw new Error("All_fields_are_required");
  }

  const existingUser = await userRepository.findbyEmailandUsername(
    username,
    email,
  );
  if (existingUser) {
    throw new Error("Username_or_email_already_exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
   const otp = generateOTP();

  const newUser = await userRepository.createUser({
    name,
    username,
    email,
    password: hashedPassword,
    isVerified: false,
    verificationCode: otp,
    verificationCodeExpires: Date.now() + 10 * 60 * 1000,
  });


  try {
    await sendOTPEmail(email, otp);
  } catch (err) {
    console.error("Email error:", err);
    throw new Error("Email_send_failed");
  }


  return { newUser };
}

// ================= VERIFY OTP =================
async function verifyCodeService(email, code) {
  const user = await userRepository.findbyEmailandUsername(null, email);

  if (!user) throw new Error("User_not_found");

  if (user.isVerified) throw new Error("Already_verified");

  if (!user.verificationCode || user.verificationCode !== code) {
    throw new Error("Invalid_code");
  }

  if (user.verificationCodeExpires < Date.now()) {
    throw new Error("Code_expired");
  }

  user.isVerified = true;
  user.verificationCode = null;
  user.verificationCodeExpires = null;

  await user.save();

  return true;
}

// ================= RESEND OTP =================
async function resendVerificationService(email) {
  const user = await userRepository.findbyEmailandUsername(null, email);

  if (!user) throw new Error("User_not_found");
  if (user.isVerified) throw new Error("Already_verified");

  const otp = generateOTP();

  user.verificationCode = otp;
  user.verificationCodeExpires = Date.now() + 10 * 60 * 1000;

  await user.save();

  try {
    await sendOTPEmail(email, otp);
  } catch (err) {
    console.error("Email resend error:", err);
    throw new Error("Email_send_failed");
  }
}


//==========LOGIN===========
async function loginUserService(userData) {
  const { email, password } = userData;

  const user = await userRepository.findbyEmailandUsername(null, email);
  if (!user) {
    throw new Error("Invalid_email_or_password");
  }

  if (!user.isVerified) {
    throw new Error("Email_not_verified");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new Error("Invalid_email_or_password");
  }

  // 🔐 Admin + MFA enabled → require MFA verification
  if (user.role === "admin" && user.mfaEnabled) {
    return {
      status: "MFA_REQUIRED",
      userId: user._id,
    };
  }

  // 🔐 First-time admin → setup MFA
  if (user.role === "admin" && !user.mfaEnabled) {
    return {
      status: "SETUP_MFA",
      userId: user._id,
    };
  }

  // ✅ Normal login (non-admin or admin without MFA requirement)
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
  );

  return {
    status: "SUCCESS",
    user: {
      id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      plan: user.plan,
    },
    token,
  };
}

//=================== FORGOT PASSWORD =================
async function forgotPassword(email) {
  const user = await userRepository.findbyEmailandUsername(null, email);

  if (!user) {
    return { message: "If email exists, OTP sent" };
  }

  const otp = generateforgotPasswordOTP();

  user.resetPasswordOTP = await bcrypt.hash(otp, 10);
  user.resetPasswordOTPExpires = Date.now() + 10 * 60 * 1000;
  user.resetPasswordAttempts = 0;

  await userRepository.updateUser(user);

  await sendForgotPasswordOTP(email, otp);

  return { message: "OTP sent to email" };
};


//=================== RESET PASSWORD =================
async function resetPassword(email, otp, newPassword) {
  const user = await userRepository.findbyEmailandUsername(null, email);

  if (!user) {
    throw new Error("Invalid request");
  }

  if (user.resetPasswordOTPExpires < Date.now()) {
    throw new Error("OTP expired");
  }

  if (user.resetPasswordAttempts >= 5) {
    throw new Error("Too many attempts. Try again later.");
  }

  const isMatch = await bcrypt.compare(otp, user.resetPasswordOTP);

  if (!isMatch) {
    user.resetPasswordAttempts += 1;
    await userRepository.updateUser(user);
    throw new Error("Invalid OTP");
  }

  user.password = await bcrypt.hash(newPassword, 10);

  user.resetPasswordOTP = undefined;
  user.resetPasswordOTPExpires = undefined;
  user.resetPasswordAttempts = 0;

  await userRepository.updateUser(user);

  return { message: "Password reset successful" };
};



//=================== USER PROFILE =================
async function userProfileService(userId) {
  const user = await userRepository.findUserById(userId);
  if (!user) {
    throw new Error("User_not_found");
  }
  return {
    id: user._id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    plan: user.plan,
    planActivatedAt: user.planActivatedAt,
    planExpiresAt: user.planExpiresAt,
  };
}


//=================== UPGRADE PLAN =================
async function upgradePlanService(userId) {
  const user = await userRepository.findUserById(userId);

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  if (user.plan === "premium") {
    console.log("⚠️ Already premium");
    throw new Error("ALREADY_PREMIUM");
  }

  user.plan = "premium";
  user.planActivatedAt = new Date();

  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 30);
  user.planExpiresAt = expiry;
  const savedUser = await user.save();

  console.log("✅ USER AFTER SAVE:", savedUser);

  return {
    plan: user.plan,
    activatedAt: user.planActivatedAt,
    expiresAt: user.planExpiresAt,
  };
}

//=================== GET CURRENT USER =================
async function getCurrentUser(userId) {
  const user = await userRepository.findUserById(userId);
  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }
  return {
    id: user._id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    plan: user.plan,
    planActivatedAt: user.planActivatedAt,
    planExpiresAt: user.planExpiresAt,
  };
}

// 🔥🔥🔥 For admin only 🔥🔥🔥

async function setupMfaService(userId) {
  const user = await userRepository.findUserById(userId);

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  if (user.role !== "admin") {
    throw new Error("ADMIN_ONLY");
  }

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔧 MFA SETUP");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📧 User:", user.email);

  // ✅ STEP 1: If already exists → reuse
  if (user.mfaSecret) {
    console.log("⚠️ MFA already exists. Reusing secret:", user.mfaSecret);

    const otpauth = `otpauth://totp/NoteForge:${user.email}?secret=${user.mfaSecret}&issuer=NoteForge`;
    const qr = await QRCode.toDataURL(otpauth);

    return {
      qr,
      secret: user.mfaSecret,
      manualEntry: user.mfaSecret,
    };
  }

  // ✅ STEP 2: Generate NEW secret only once
  const secret = speakeasy.generateSecret({
    name: `NoteForge (${user.email})`,
    length: 32,
  });

  console.log("🔑 New Secret:", secret.base32);

  const testToken = speakeasy.totp({
    secret: secret.base32,
    encoding: "base32",
  });

  console.log("🎯 Test token:", testToken);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // ✅ Save
  await userRepository.updateUser(userId, {
    mfaSecret: secret.base32,
    mfaEnabled: false,
  });

  // ✅ STEP 3: ALWAYS return
  const otpauth = `otpauth://totp/NoteForge:${user.email}?secret=${secret.base32}&issuer=NoteForge`;
  const qr = await QRCode.toDataURL(otpauth);

  return {
    qr,
    secret: secret.base32,
    manualEntry: secret.base32,
  };
}


//=================== VERIFY MFA =================
async function verifyMfaService(userId, otp) {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔍 MFA VERIFICATION STARTED");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📥 User ID:", userId);
  console.log("📥 OTP:", otp);
  console.log("🕐 Server time:", new Date().toISOString());

  let user;
  try {
    user = await userRepository.findUserById(userId, { mfaEnabled: true });
    console.log("✅ Database query executed");
  } catch (dbError) {
    console.error("❌ Database error:", dbError);
    throw new Error("DATABASE_ERROR");
  }

  if (!user) {
    console.log("❌ USER NOT FOUND in database");
    throw new Error("USER_NOT_FOUND");
  }

  console.log("✅ User found:", {
    id: user._id,
    email: user.email,
    role: user.role,
    mfaEnabled: user.mfaEnabled,
    hasMfaSecret: !!user.mfaSecret,
  });

  if (!user.mfaSecret) {
    console.log("❌ MFA NOT SETUP - No secret found");
    throw new Error("MFA_NOT_SETUP");
  }

  // Clean the OTP
  const cleanOtp = otp.toString().trim().replace(/\s+/g, "").replace(/-/g, "");
  console.log("🧹 Cleaned OTP:", cleanOtp);

  // Generate what the current token SHOULD be
  const serverToken = speakeasy.totp({
    secret: user.mfaSecret,
    encoding: "base32",
  });
  console.log("🎯 Server expects token:", serverToken);
  console.log("📱 User provided token:", cleanOtp);
  console.log("🔍 Tokens match:", serverToken === cleanOtp);

  // Verify with multiple windows for debugging
  for (let window = 0; window <= 10; window++) {
    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: "base32",
      token: cleanOtp,
      window: window,
    });

    if (verified && window > 0) {
      console.log(
        `⚠️  Token verified with window=${window} (time drift detected)`,
      );
      break;
    }
  }

  // Actual verification with reasonable window
  const verified = speakeasy.totp.verify({
    secret: user.mfaSecret,
    encoding: "base32",
    token: cleanOtp,
    window: 10, // Very lenient for debugging - you can reduce this later
  });

  console.log("🔐 Verification Result:", verified);

  if (!verified) {
    console.log("❌ INVALID OTP - Verification failed");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    throw new Error("INVALID_OTP");
  }

  console.log("✅ MFA VERIFICATION SUCCESSFUL");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
  );

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      plan: user.plan,
    },
  };
}

module.exports = {
  registerUserService,
  loginUserService,
  userProfileService,
  upgradePlanService,
  getCurrentUser,
  setupMfaService,
  verifyMfaService,
  verifyCodeService,
 resendVerificationService,
 forgotPassword,
 resetPassword,
};
