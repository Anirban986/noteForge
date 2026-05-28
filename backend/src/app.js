console.log("APP FILE LOADED");

const express = require("express");
const app = express();

const cookieParser = require("cookie-parser");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

// ─────────────────────────────
// Routes
// ─────────────────────────────
const authroutes = require("./routes/user.routes");
const notesroutes = require("./routes/notes.routes");
const paymentRoutes = require("./routes/payment.routes");

// ─────────────────────────────
// Allowed Origins
// ─────────────────────────────
const allowedOrigins = [
  "http://localhost:5173",
  process.env.CLIENT_URL
].filter(Boolean);

// ─────────────────────────────
// CORS Middleware
// ─────────────────────────────
app.use(
  cors({
    origin: function (origin, callback) {
      // allow tools like Postman
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(null, false); // block unknown origins safely
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);




// ─────────────────────────────
// Core Middlewares
// ─────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─────────────────────────────
// Health Check
// ─────────────────────────────
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "express",
  });
});

// ─────────────────────────────
// Routes
// ─────────────────────────────
app.use("/api/auth", authroutes);
app.use("/api/notes", notesroutes);
app.use("/api/payment", paymentRoutes);

// ─────────────────────────────
// Export App
// ─────────────────────────────
module.exports = app;