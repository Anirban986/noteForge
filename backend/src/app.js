const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const cors = require("cors");
const authroutes = require("../src/routes/user.routes")


app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: "http://localhost:5173", // your frontend URL
    credentials: true,               // ← allows cookies cross-origin
}));


app.use("/api/auth", authroutes);

module.exports = app;