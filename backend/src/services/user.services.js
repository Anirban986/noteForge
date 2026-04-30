const userRepository = require("../repositories/user.repository");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const QRCode = require("qrcode");
const speakeasy = require("speakeasy");
const User = require("../models/user.model");

dotenv.config();

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
  const newUser = await userRepository.createUser({
    name,
    username,
    email,
    password: hashedPassword,
  });

  const token = jwt.sign(
    { id: newUser._id, role: newUser.role || "user" },
    process.env.JWT_SECRET,
  );

  return { newUser, token };
}

async function loginUserService(userData) {
  const { email, password } = userData;

  const user = await userRepository.findbyEmailandUsername(null, email);
  if (!user) {
    throw new Error("Invalid_email_or_password");
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
  await User.findByIdAndUpdate(userId, {
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
};
