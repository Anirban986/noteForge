const userRepository = require("../repositories/user.repository");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const QRCode = require("qrcode");
const speakeasy = require("speakeasy");
const nodemailer = require("nodemailer");
const { generateforgotPasswordOTP } = require("../utils/otp");
const { sendForgotPasswordOTP } = require("../utils/mailer");

dotenv.config();

// ================= EMAIL SETUP =================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS,
  },
});

// ================= HELPERS =================
const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

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

/**
 * Builds the safe public user object returned to the frontend.
 * Never expose password, mfaSecret, verificationCode, or reset OTP fields.
 */
function sanitizeUser(user) {
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

function signToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// ================= REGISTER =================
async function registerUserService({ name, username, email, password }) {
  if (!name || !username || !email || !password) {
    throw new Error("All_fields_are_required");
  }

  // Repository now accepts (username, email) as two separate args.
  const existingUser = await userRepository.findByEmailOrUsername(username, email);
  if (existingUser) throw new Error("Username_or_email_already_exists");

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

  await sendOTPEmail(email, otp);

  return { newUser };
}

// ================= VERIFY EMAIL =================
/**
 * After a successful verify, we issue a token immediately so the frontend
 * (VerifyScreen) can log the user in without a second round-trip.
 * The frontend checks for data.token and calls setAuthSession if present,
 * or falls back to GOTO_LOGIN if the server chooses not to issue one here.
 */
async function verifyCodeService(email, code) {
  const user = await userRepository.findByEmail(email);

  if (!user) throw new Error("User_not_found");
  if (user.isVerified) throw new Error("Already_verified");
  if (user.verificationCode !== code) throw new Error("Invalid_code");
  if (user.verificationCodeExpires < Date.now()) throw new Error("Code_expired");

  await userRepository.updateUser(user._id, {
    isVerified: true,
    verificationCode: null,
    verificationCodeExpires: null,
  });

  // Re-fetch so the document reflects the update before we sign a token.
  const verifiedUser = await userRepository.findByEmail(email);

  const token = signToken(verifiedUser);

  return { token, user: sanitizeUser(verifiedUser) };
}

// ================= RESEND OTP =================
async function resendVerificationService(email) {
  const user = await userRepository.findByEmail(email);

  if (!user) throw new Error("User_not_found");
  if (user.isVerified) throw new Error("Already_verified");

  const otp = generateOTP();

  await userRepository.updateUser(user._id, {
    verificationCode: otp,
    verificationCodeExpires: Date.now() + 10 * 60 * 1000,
  });

  await sendOTPEmail(email, otp);
}

// ================= LOGIN =================
async function loginUserService({ email, password }) {
  const user = await userRepository.findByEmail(email);

  if (!user) throw new Error("Invalid_email_or_password");
  if (!user.isVerified) throw new Error("Email_not_verified");

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) throw new Error("Invalid_email_or_password");

  // Admin MFA flow — no token issued yet.
  if (user.role === "admin") {
    if (user.mfaEnabled) {
      return { status: "MFA_REQUIRED", userId: user._id };
    }
    return { status: "SETUP_MFA", userId: user._id };
  }

  const token = signToken(user);

  return {
    status: "SUCCESS",
    token,
    user: sanitizeUser(user),
  };
}

// ================= FORGOT PASSWORD =================
async function forgotPassword(email) {
  const user = await userRepository.findByEmail(email);

  // Always return the same message to prevent email enumeration.
  if (!user) return { message: "If email exists, OTP sent" };

  const otp = generateforgotPasswordOTP();

  await userRepository.updateUser(user._id, {
    resetPasswordOTP: await bcrypt.hash(otp, 10),
    resetPasswordOTPExpires: Date.now() + 10 * 60 * 1000,
    resetPasswordAttempts: 0,
  });

  await sendForgotPasswordOTP(email, otp);

  return { message: "OTP sent to email" };
}

// ================= RESET PASSWORD =================
async function resetPassword(email, otp, newPassword) {
  const user = await userRepository.findByEmail(email);

  if (!user) throw new Error("Invalid request");
  if (user.resetPasswordOTPExpires < Date.now()) throw new Error("OTP expired");
  if (user.resetPasswordAttempts >= 5) throw new Error("Too many attempts");

  const isMatch = await bcrypt.compare(otp, user.resetPasswordOTP);

  if (!isMatch) {
    await userRepository.updateUser(user._id, {
      resetPasswordAttempts: user.resetPasswordAttempts + 1,
    });
    throw new Error("Invalid OTP");
  }

  await userRepository.updateUser(user._id, {
    password: await bcrypt.hash(newPassword, 10),
    resetPasswordOTP: null,
    resetPasswordOTPExpires: null,
    resetPasswordAttempts: 0,
  });

  return { message: "Password reset successful" };
}

// ================= PROFILE =================
async function userProfileService(userId) {
  // Use the canonical findUserById (not a non-existent findById).
  const user = await userRepository.findUserById(userId);
  if (!user) throw new Error("User_not_found");
  return sanitizeUser(user);
}

// ================= MFA SETUP =================
async function setupMfaService(userId) {
  const user = await userRepository.findUserById(userId);

  if (!user) throw new Error("USER_NOT_FOUND");
  if (user.role !== "admin") throw new Error("ADMIN_ONLY");

  let secret = user.mfaSecret;

  if (!secret) {
    const generated = speakeasy.generateSecret({
      name: `NoteForge (${user.email})`,
      length: 32,
    });

    secret = generated.base32;

    await userRepository.updateUser(userId, {
      mfaSecret: secret,
      mfaEnabled: false,
    });
  }

  const otpauth = `otpauth://totp/NoteForge:${user.email}?secret=${secret}&issuer=NoteForge`;
  const qr = await QRCode.toDataURL(otpauth);

  return { qr, secret, manualEntry: secret };
}

// ================= MFA VERIFY =================
async function verifyMfaService(userId, otp) {
  const user = await userRepository.findUserById(userId);

  if (!user) throw new Error("USER_NOT_FOUND");
  if (!user.mfaSecret) throw new Error("MFA_NOT_SETUP");

  const cleanOtp = otp.toString().replace(/\D/g, "");

  const verified = speakeasy.totp.verify({
    secret: user.mfaSecret,
    encoding: "base32",
    token: cleanOtp,
    window: 1,
  });

  if (!verified) throw new Error("INVALID_OTP");

  // Mark MFA as fully enabled after first successful verify (setup flow).
  if (!user.mfaEnabled) {
    await userRepository.updateUser(userId, { mfaEnabled: true });
  }

  const token = signToken(user);

  // Return sanitized user — never expose the raw Mongoose document.
  return { token, user: sanitizeUser(user) };
}

// ================= UPGRADE PLAN =================
async function upgradePlanService(userId) {
  const user = await userRepository.findUserById(userId);

  if (!user) throw new Error("USER_NOT_FOUND");
  if (user.plan === "premium") throw new Error("ALREADY_PREMIUM");

  const planActivatedAt = new Date();
  const planExpiresAt = new Date();
  planExpiresAt.setDate(planExpiresAt.getDate() + 30);

  // Use repository update rather than mutating + saving the document directly.
  const updated = await userRepository.updateUser(userId, {
    plan: "premium",
    planActivatedAt,
    planExpiresAt,
  });

  return {
    plan: updated.plan,
    planActivatedAt: updated.planActivatedAt,
    planExpiresAt: updated.planExpiresAt,
  };
}

// ================= GET CURRENT USER =================
async function getCurrentUserService(userId) {
  const user = await userRepository.findUserById(userId);
  if (!user) throw new Error("USER_NOT_FOUND");
  return sanitizeUser(user);
}

module.exports = {
  registerUserService,
  loginUserService,
  verifyCodeService,
  resendVerificationService,
  forgotPassword,
  resetPassword,
  userProfileService,
  setupMfaService,
  verifyMfaService,
  upgradePlanService,
  getCurrentUserService,
};