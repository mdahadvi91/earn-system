// ================= SERVER.JS =================
// এই ফাইল হলো আমাদের ওয়েবসাইটের মেইন সার্ভার
// সবকিছু এখান থেকে চালু হয় — Express, MongoDB, Routes, Anti-Fraud

// ================= IMPORT =================
const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
const helmet = require("helmet");
require("dotenv").config();

// নতুন ফাইলগুলো import করা হচ্ছে
const { helmet: helmetMiddleware, apiLimiter, deviceFraudMiddleware } = require('./middleware');
const config = require('./config');

const app = express();

// ================= SAFETY =================
// সার্ভারে কোনো সমস্যা হলে লগ দেখার জন্য
process.on("uncaughtException", err => console.error("❌ Uncaught Exception:", err));
process.on("unhandledRejection", err => console.error("❌ Unhandled Rejection:", err));

// ================= MIDDLEWARE =================
// সিকিউরিটি এবং রেট লিমিট সেট করা হচ্ছে
app.use(helmetMiddleware);           // সিকিউরিটি হেডার যোগ করে
app.use(apiLimiter);                 // অনেক রিকোয়েস্ট থেকে বাঁচায়
app.use(cors());
app.use(express.json());

// Static ফাইল সার্ভ করার জন্য (HTML, CSS, JS)
app.uapp.use(express.static(__dirname));

// ================= MONGO DB CONNECT =================
// ডাটাবেসের সাথে কানেকশন
mongoose.connect(config.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch(err => {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1);
  });

// ================= USER MODEL =================
// ইউজারের তথ্য স্টোর করার জন্য মডেল
// deviceId দিয়ে anti-fraud করা হয়
const UserSchema = new mongoose.Schema({
  userId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  balance: { 
    type: Number, 
    default: 0 
  },
  totalEarned: { 
    type: Number, 
    default: 0 
  },
  
  // Anti-Fraud Fields
  deviceId: { 
    type: String, 
    index: true 
  },
  lastIP: String,
  lastLogin: Date,
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

const User = mongoose.model("User", UserSchema);

// ================= ANTI-FRAUD HELPER =================
// একই ডিভাইসে একাধিক অ্যাকাউন্ট তৈরি করতে না দেওয়ার চেক
async function checkDeviceFraud(deviceId, currentUserId = null) {
  if (!deviceId) return { allowed: true };

  const existingUser = await User.findOne({ deviceId: deviceId });
  
  if (existingUser && existingUser.userId !== currentUserId) {
    return { 
      allowed: false, 
      message: "এই ডিভাইস দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট তৈরি করা আছে। একই ডিভাইসে একাধিক অ্যাকাউন্ট চলবে না।" 
    };
  }
  return { allowed: true };
}

// ================= ROUTES =================

// Home Page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Task Page
app.get("/task", (req, res) => {
  res.sendFile(path.join(__dirname, "pages/task.html"));
});

// Health Check
app.get("/health", (req, res) => res.status(200).send("Server is Healthy"));

// ================= CREATE / LOGIN USER =================
// ইউজার তৈরি বা লগইন — Device ID চেক সহ
app.post("/api/user", async (req, res) => {
  try {
    const { userId, deviceId } = req.body;
    const ip = req.ip || req.headers['x-forwarded-for'];

    if (!userId || !deviceId) {
      return res.status(400).json({ error: "userId এবং deviceId দিতে হবে" });
    }

    // Anti-Fraud চেক
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
      console.log(`✅ নতুন ইউজার তৈরি হয়েছে: ${userId}`);
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
    console.error(err);
    res.status(500).json({ error: "সার্ভারে সমস্যা হয়েছে" });
  }
});

// ================= GET USER BALANCE =================
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

// ================= SERVER START =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log("✅ Clean Server with Device Anti-Fraud Ready");
});
