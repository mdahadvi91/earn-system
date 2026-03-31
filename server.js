// ================= TASK CONFIG =================
const MAX_ADS_PER_DAY = 50;
const ADS_PER_TASK = 5;
const REWARD_PER_TASK = 2;
const AD_TIMER = 15000;

// ================= IMPORT =================
const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");

// ================= APP INIT =================
const app = express();

// ================= GLOBAL SAFETY =================
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err);
});

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json());

// ================= DATABASE =================
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.log("❌ DB Error:", err));

mongoose.connection.on("disconnected", () => {
  console.log("⚠️ MongoDB Disconnected...");
});

mongoose.connection.on("reconnected", () => {
  console.log("🔄 MongoDB Reconnected");
});

// ================= MODEL =================
const User = mongoose.model("User", new mongoose.Schema({
  userId: String,
  balance: { type: Number, default: 0 },
  totalAds: { type: Number, default: 0 },
  claimedTasks: { type: Array, default: [] },
  refBy: String,
  ip: String,
  deviceId: String,
  lastWatch: Number,
  suspicious: { type: Number, default: 0 },
  blocked: { type: Boolean, default: false },
  lastBonus: String
}));

// ✅ NEW (EarnLog add)
const EarnLog = mongoose.model("EarnLog", new mongoose.Schema({
  userId: String,
  amount: Number,
  source: String,
  time: { type: Date, default: Date.now }
}));

// ================= STATIC =================
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// ================= HEALTH =================
app.get("/health", (req, res) => {
  res.send("OK");
});

// ================= USER =================
app.get("/api/user/:id", async (req, res) => {
  try {
    let user = await User.findOne({ userId: req.params.id });

    if (!user) {
      user = await User.create({
        userId: req.params.id,
        ip: req.ip
      });
    }

    res.json(user);

  } catch {
    res.status(500).json({ error: "Server Error" });
  }
});

// ================= WATCH AD =================
// ================= FIX =================
if (!req.body.userId || !req.body.deviceId) {
  return res.status(400).json({ error: "Missing userId or deviceId" });
}
app.post("/api/watch-ad", async (req, res) => {
  try {
    const { userId, deviceId } = req.body;
    const ip = req.ip;

    let user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.blocked) return res.status(403).json({ error: "Blocked" });

    if (user.deviceId && user.deviceId !== deviceId) {
      user.suspicious += 1;
    }

    if (!user.deviceId) user.deviceId = deviceId;

    const now = Date.now();
    if (user.lastWatch && now - user.lastWatch < AD_TIMER) {
      return res.status(400).json({ error: "Too fast" });
    }

    if (user.totalAds >= MAX_ADS_PER_DAY) {
      return res.json({ message: "Limit reached" });
    }

    user.totalAds += 1;
    user.lastWatch = now;
    user.ip = ip;

    await user.save();

    res.json({ success: true, totalAds: user.totalAds });

  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// ================= CLAIM =================
app.post("/api/claim-task", async (req, res) => {
  try {
    const { userId } = req.body;
    let user = await User.findOne({ userId });

    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.totalAds < ADS_PER_TASK) {
      return res.status(400).json({ error: "Not enough ads" });
    }

    const taskIndex = Math.floor(user.totalAds / ADS_PER_TASK);

    if (user.claimedTasks.includes(taskIndex)) {
      return res.status(400).json({ error: "Already claimed" });
    }

    const reward = REWARD_PER_TASK * 0.6;

    user.balance += reward;
    user.claimedTasks.push(taskIndex);

    await user.save();

    res.json({ success: true, reward, balance: user.balance });

  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// ================= CPA POSTBACK =================
app.get("/api/postback", async (req, res) => {
  try {
    const { user_id, amount, trans_id } = req.query;

    if (!user_id || !amount || !trans_id) return res.send("Invalid");

    let user = await User.findOne({ userId: user_id });
    if (!user) return res.send("No user");

    const exist = await EarnLog.findOne({ source: trans_id });
    if (exist) return res.send("Duplicate");

    const reward = Number(amount) * 0.6;

    user.balance += reward;
    await user.save();

    await EarnLog.create({
      userId: user_id,
      amount: reward,
      source: trans_id
    });

    res.send("OK");

  } catch {
    res.send("Error");
  }
});

// ================= ✅ WANNAADS (FIXED SEPARATE) =================
app.get("/api/wannads-postback", async (req, res) => {
  try {
    const { userId, reward, trans_id } = req.query;

    if (!userId || !reward || !trans_id) return res.send("Invalid");

    let user = await User.findOne({ userId });
    if (!user) return res.send("No user");

    const exist = await EarnLog.findOne({ source: trans_id });
    if (exist) return res.send("Duplicate");

    const amount = Number(reward) * 0.6;

    user.balance += amount;
    await user.save();

    await EarnLog.create({
      userId,
      amount,
      source: trans_id
    });

    res.send("OK");

  } catch {
    res.send("Error");
  }
});

// ================= SERVER =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Server Running:", PORT);
});
