console.log("APP FILE LOADED");
const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const cors = require("cors");
const authroutes = require("./routes/user.routes");
const notesroutes = require("./routes/notes.routes");
const paymentRoutes = require("./routes/payment.routes");

const path = require("path");
console.log(__dirname);


// CORS configuration
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true, // Allow cookies cross-origin
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["set-cookie"],
  }),
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
