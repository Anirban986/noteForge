console.log("APP FILE LOADED");
const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const cors = require("cors");
const authroutes = require("./routes/user.routes");
const notesroutes = require("./routes/notes.routes");
const paymentRoutes = require("./routes/payment.routes");
const dotenv=require("dotenv");
dotenv.config();
const path = require("path");
console.log(__dirname);

const allowedOrigins = [
  "http://localhost:5173", // Vite dev
  process.env.CLIENT_URL   // future deployed frontend
];


// CORS configuration
app.use(
  cors({
    origin: function (origin, callback) {
      // allow REST tools like Postman (no origin)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Blocked by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);


// Middleware to parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

//using /health to check if the server is running
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "express" });
});


// Routes
app.use("/api/auth", authroutes);
app.use("/api/notes", notesroutes);
app.use("/api/payment", paymentRoutes);

module.exports = app;
