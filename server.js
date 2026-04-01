// ================= CONFIG =================
const MAX_ADS_PER_DAY = 50;        // দিনে সর্বোচ্চ অ্যাড
const ADS_PER_TASK = 5;            // ৫টা অ্যাড = ১টা টাস্ক
const REWARD_PER_TASK = 2;         // প্রতি টাস্কে ২ টাকা
const AD_TIMER = 15000;            // ১৫ সেকেন্ড অপেক্ষা

// ================= IMPORT =================
const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
const helmet = require("helmet");
require("dotenv").config();

const app = express();

// ================= SAFETY =================
process.on("uncaughtException", err => {
  console.error("❌ Uncaught Exception:", err);
});
process.on("unhandledRejection", err => {
  console.error("❌ Unhandled Rejection:", err);
});

// ================= MIDDLEWARE =================
app.use(helmet());                    // Security header
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ================= DB CONNECT =================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch(err => {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1);
  });

// ================= USER MODEL (Anti-Fraud Added) =================
const UserSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  balance: { type: Number, default: 0 },
  totalAds: { type: Number, default: 0 },
  claimedTasks: { type: [Number], default: [] },
  
  // Anti-Fraud Fields
  deviceId: { type: String, index: true },           // FingerprintJS থেকে আসবে
  lastIP: String,
  lastLogin: Date,
  createdAt: { type: Date, default: Date.now },
  totalEarned: { type: Number, default: 0 }
});

const User = mongoose.model("User", UserSchema);

// ================= HELPER: Anti-Fraud Check =================
async function checkDeviceFraud(deviceId, ip, userId = null) {
  if (!deviceId) return { allowed: true };

  const existing = await User.findOne({ deviceId });
  
  if (existing && existing.userId !== userId) {
    return { 
      allowed: false, 
      message: "এই ডিভাইস দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট তৈরি করা হয়েছে। একই ডিভাইসে একাধিক অ্যাকাউন্ট অনুমোদিত নয়।" 
    };
  }
  return { allowed: true };
}

// ================= ROUTES =================

// Home Page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// Task Page
app.get("/task", (req, res) => {
  res.sendFile(path.join(__dirname, "public/pages/task.html"));
});

// Health Check (Render.com এর জন্য ভালো)
app.get("/health", (req, res) => res.status(200).send("OK"));

// ================= CREATE / GET USER =================
app.post("/api/create-user", async (req, res) => {
  try {
    const { userId, deviceId, ip } = req.body;

    if (!userId || !deviceId) {
      return res.status(400).json({ error: "userId এবং deviceId দরকার" });
    }

    const fraudCheck = await checkDeviceFraud(deviceId, ip, userId);
    if (!fraudCheck.allowed) {
      return res.status(403).json({ error: fraudCheck.message });
    }

    let user = await User.findOne({ userId });

    if (!user) {
      user = await User.create({
        userId,
        deviceId,
        lastIP: ip || req.ip,
        lastLogin: new Date()
      });
      console.log(`✅ New User Created: ${userId}`);
    } else {
      // Existing user-এর device check
      if (user.deviceId && user.deviceId !== deviceId) {
        return res.status(403).json({ error: "এই অ্যাকাউন্ট অন্য ডিভাইসে লগইন করা আছে।" });
      }
      user.deviceId = deviceId;
      user.lastIP = ip || req.ip;
      user.lastLogin = new Date();
      await user.save();
    }

    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ================= WATCH AD (Anti-Fraud + Timer) =================
app.post("/api/watch-ad", async (req, res) => {
  try {
    const { userId, deviceId } = req.body;

    if (!userId || !deviceId) {
      return res.status(400).json({ error: "Missing userId or deviceId" });
    }

    let user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Device Check
    if (user.deviceId && user.deviceId !== deviceId) {
      return res.status(403).json({ error: "ডিভাইস মিলছে না। অন্য ডিভাইস থেকে লগইন করা আছে।" });
    }

    const now = Date.now();

    // Fast click protection
    if (user.lastWatch && now - user.lastWatch < AD_TIMER) {
      return res.status(429).json({ error: `অপেক্ষা করুন ${Math.ceil((AD_TIMER - (now - user.lastWatch))/1000)} সেকেন্ড` });
    }

    // Daily limit
    if (user.totalAds >= MAX_ADS_PER_DAY) {
      return res.json({ message: "আজকের অ্যাড লিমিট শেষ হয়েছে। কাল আবার চেষ্টা করুন।" });
    }

    // Update
    user.totalAds += 1;
    user.lastWatch = now;
    user.deviceId = deviceId;

    await user.save();

    res.json({ 
      success: true, 
      totalAds: user.totalAds,
      message: "Ad watched successfully" 
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ================= CLAIM TASK =================
app.post("/api/claim-task", async (req, res) => {
  try {
    const { userId } = req.body;

    let user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.totalAds < ADS_PER_TASK) {
      return res.status(400).json({ error: `প্রথমে ${ADS_PER_TASK}টা অ্যাড দেখুন` });
    }

    const taskIndex = Math.floor((user.totalAds - 1) / ADS_PER_TASK);

    if (user.claimedTasks.includes(taskIndex)) {
      return res.status(400).json({ error: "এই টাস্ক ইতিমধ্যে ক্লেইম করা হয়েছে" });
    }

    const reward = REWARD_PER_TASK;

    user.balance += reward;
    user.totalEarned += reward;
    user.claimedTasks.push(taskIndex);

    await user.save();

    res.json({ 
      success: true, 
      reward, 
      newBalance: user.balance,
      message: `${reward} টাকা আপনার ব্যালেন্সে যোগ হয়েছে` 
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ================= SERVER START =================
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log("Anti-Fraud + Device ID system active");
});
