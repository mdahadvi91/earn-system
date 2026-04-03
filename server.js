// ================= IMPORT =================
const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config();

const { helmet: helmetMiddleware, apiLimiter } = require('./middleware');
const config = require('./config');

const app = express();

// ================= VERY IMPORTANT (RENDER FIX) =================
app.set('trust proxy', 1); // fix rate-limit crash on Render

// ================= SAFETY =================
process.on("uncaughtException", err => console.error("❌ Uncaught Exception:", err));
process.on("unhandledRejection", err => console.error("❌ Unhandled Rejection:", err));

// ================= MIDDLEWARE =================
app.use(helmetMiddleware);
app.use(apiLimiter);
app.use(cors());
app.use(express.json());

// ================= STATIC FILE FIX =================
// First try public (if exists), fallback to root
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(__dirname));

// ================= MONGO =================
mongoose.connect(config.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ Mongo Error:", err));

// ================= ROUTES =================

// HOME (auto detect)
app.get("/", (req, res) => {
  const publicPath = path.join(__dirname, "public/index.html");
  const rootPath = path.join(__dirname, "index.html");

  res.sendFile(require("fs").existsSync(publicPath) ? publicPath : rootPath);
});

// TASK (safe)
app.get("/task", (req, res) => {
  const publicPath = path.join(__dirname, "public/pages/task.html");
  const rootPath = path.join(__dirname, "pages/task.html");

  if (require("fs").existsSync(publicPath)) {
    res.sendFile(publicPath);
  } else if (require("fs").existsSync(rootPath)) {
    res.sendFile(rootPath);
  } else {
    res.status(404).send("Task page not found");
  }
});

// HEALTH
app.get("/health", (req, res) => res.send("OK"));

// ================= API =================
app.post("/api/user", (req, res) => {
  res.json({ success: true });
});

// ================= FALLBACK (IMPORTANT) =================
app.get("*", (req, res) => {
  const filePath = path.join(__dirname, "index.html");
  res.sendFile(filePath);
});

// ================= SERVER =================
const PORT = process.env.PORT || config.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on ${PORT}`);
});
