const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

/**
 * Extract token from:
 * 1. Authorization header
 * 2. Cookie (token)
 */
function extractToken(req) {
  const headerToken =
    req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : null;

  const cookieToken = req.cookies?.token;

  return headerToken || cookieToken || null;
}

/**
 * AUTH MIDDLEWARE
 */
async function userMiddleware(req, res, next) {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        message: "Not authorized - token missing",
      });
    }

    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token expired" });
      }

      return res.status(401).json({ message: "Invalid token" });
    }

    const user = await User.findById(decoded.id).select(
      "_id role isVerified email",
    );

    if (!user) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        message: "Email not verified",
      });
    }

    // Attach minimal safe context
    req.user = {
      id: user._id,
      role: user.role,
      email: user.email,
    };

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);

    res.status(500).json({
      message: "Authentication failed",
    });
  }
}

/**
 * ADMIN MIDDLEWARE
 */
function adminMiddleware(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "User context missing",
      });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Admin access required",
      });
    }

    next();
  } catch (error) {
    console.error("Admin middleware error:", error);

    res.status(500).json({
      message: "Authorization error",
    });
  }
}

module.exports = {
  userMiddleware,
  adminMiddleware,
};