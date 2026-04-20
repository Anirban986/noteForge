console.log("APP FILE LOADED");
const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const cors = require("cors");
const authroutes = require("./routes/user.routes");
const notesroutes = require("./routes/notes.routes");

const path = require("path");
console.log(__dirname);


app.use(cors({
    origin: "http://localhost:5173", 
    credentials: true, // Allow cookies cross-origin
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["set-cookie"]
}));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use(cookieParser());


app.use("/api/auth", authroutes);
app.use("/api/notes", notesroutes);

module.exports = app;