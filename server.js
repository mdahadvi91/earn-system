// ================= SERVER.JS - FINAL STRONG VERSION =================
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const app = express();

// ====================== SECURITY ======================
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: false,   // three.js এর জন্য
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: '*',   // পরে প্রোডাকশনে নির্দিষ্ট করতে পারো
  methods: ['GET', 'POST']
}));

// Body Parser with limit
app.use(express.json({ limit: '10kb' }));

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 120,                   // প্রতি 15 মিনিটে 120 রিকোয়েস্ট
  message: { error: "Too many requests from this IP, please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", apiLimiter);

// Static files serve
app.use(express.static(__dirname));

// ====================== MONGO DB ======================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch(err => {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1);
  });

// ====================== USER MODEL ======================
const UserSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  balance: { type: Number, default: 0 },
  totalEarned: { type: Number, default: 0 },
  deviceId: { type: String, index: true },
  lastIP: String,
  lastLogin: Date,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", UserSchema);

// ====================== ANTI-FRAUD ======================
async function checkDeviceFraud(deviceId, currentUserId = null) {
  if (!deviceId) return { allowed: true };

  const existing = await User.findOne({ deviceId });
  if (existing && existing.userId !== currentUserId) {
    return {
      allowed: false,
      message: "এই ডিভাইস দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট তৈরি করা আছে। একই ডিভাইসে একাধিক অ্যাকাউন্ট চলবে না।"
    };
  }
  return { allowed: true };
}

// ====================== ROUTES ======================

// Landing Page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Login Page
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

// Home Page
app.get("/home", (req, res) => {
  res.sendFile(path.join(__dirname, "home.html"));
});

// API - User Create / Login with Device Check
app.post("/api/user", async (req, res) => {
  try {
    const { userId, deviceId } = req.body;
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';

    if (!userId || !deviceId) {
      return res.status(400).json({ error: "userId এবং deviceId দিতে হবে" });
    }

    const fraudCheck = await checkDeviceFraud(deviceId, userId);
    if (!fraudCheck.allowed) {
      return res.status(403).json({ error: fraudCheck.message });
    }

    let user = await User.findOne({ userId });

    if (!user) {
      user = await User.create({
        userId,
        deviceId,
        lastIP: ip,
        lastLogin: new Date()
      });
      console.log(`✅ New User Created: ${userId}`);
    } else {
      if (user.deviceId && user.deviceId !== deviceId) {
        return res.status(403).json({ error: "এই অ্যাকাউন্ট অন্য ডিভাইসে লগইন করা আছে।" });
      }
      user.deviceId = deviceId;
      user.lastIP = ip;
      user.lastLogin = new Date();
      await user.save();
    }

    res.json({
      success: true,
      user: {
        userId: user.userId,
        balance: user.balance,
        totalEarned: user.totalEarned
      }
    });
  } catch (err) {
    console.error("API Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get User Balance
app.get("/api/user/:userId", async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.userId });
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      success: true,
      balance: user.balance,
      totalEarned: user.totalEarned
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Health Check
app.get("/health", (req, res) => res.status(200).send("Server is Healthy ✅"));

// ====================== FALLBACK ======================
app.get("*", (req, res) => {
  const filePath = path.join(__dirname, req.path);

  if (fs.existsSync(filePath) && !req.path.endsWith('.html')) {
    return res.sendFile(filePath);
  }

  res.sendFile(path.join(__dirname, "index.html"));
});

// ====================== START SERVER ======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log("✅ Strong Security + Device Anti-Fraud + Clean Flow Ready");
});
