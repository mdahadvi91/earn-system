// ================= TASK CONFIG =================
/*
  🔥 PURPOSE:
  Task system rules define kora
*/

const MAX_ADS_PER_DAY = 50;   // daily limit
const ADS_PER_TASK = 5;       // 5 ads = 1 task
const REWARD_PER_TASK = 2;    // 2 BDT per task
const AD_TIMER = 15000;       // 15 sec


// ================= IMPORT =================
const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");

// ================= APP INIT =================
const app = express();

// ================= GLOBAL SAFETY =================
/*
  🔥 PURPOSE:
  Server crash prevent korar jonno global error handler
*/
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
/*
  🔥 PURPOSE:
  MongoDB stable connection (auto reconnect)
*/
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.log("❌ DB Error:", err));

// auto reconnect log
mongoose.connection.on("disconnected", () => {
  console.log("⚠️ MongoDB Disconnected... reconnecting");
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

// ================= STATIC =================
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// ================= HEALTH CHECK =================
/*
  🔥 PURPOSE:
  uptime monitor ping korbe (sleep prevent)
*/
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// ================= USER API =================
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

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
});

// ================= KEEP ALIVE SYSTEM =================
/*
  🔥 PURPOSE:
  server sleep prevent (self ping)
*/
setInterval(() => {
  console.log("🔁 Keep Alive Ping");
}, 1000 * 60 * 5); // every 5 min

// ================= SERVER START =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server Running on Port ${PORT}`);
});

// ================= WATCH AD =================
/*
  🔥 PURPOSE:
  Ad watch track + anti-cheat check
*/

app.post("/api/watch-ad", async (req, res) => {
  try {
    const { userId, deviceId } = req.body;
    const ip = req.ip;

    let user = await User.findOne({ userId });

    if (!user) return res.status(404).json({ error: "User not found" });

    // 🚫 blocked user
    if (user.blocked) {
      return res.status(403).json({ error: "User blocked" });
    }

    // 🔐 device mismatch check
    if (user.deviceId && user.deviceId !== deviceId) {
      user.suspicious += 1;
    }

    // first time save device
    if (!user.deviceId) {
      user.deviceId = deviceId;
    }

    // ⏱️ timer check (anti fast click)
    const now = Date.now();
    if (user.lastWatch && now - user.lastWatch < AD_TIMER) {
      user.suspicious += 1;
      await user.save();
      return res.status(400).json({ error: "Too fast" });
    }

    // 📊 daily limit check
    if (user.totalAds >= MAX_ADS_PER_DAY) {
      return res.json({ message: "Daily limit reached" });
    }

    // update
    user.totalAds += 1;
    user.lastWatch = now;
    user.ip = ip;

    await user.save();

    res.json({
      success: true,
      totalAds: user.totalAds
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ================= CLAIM TASK =================
/*
  🔥 PURPOSE:
  5 ads complete hole reward add kora
*/

app.post("/api/claim-task", async (req, res) => {
  try {
    const { userId } = req.body;

    let user = await User.findOne({ userId });

    if (!user) return res.status(404).json({ error: "User not found" });

    // check ads
    if (user.totalAds < ADS_PER_TASK) {
      return res.status(400).json({ error: "Not enough ads" });
    }

    // prevent duplicate claim
    const taskIndex = Math.floor(user.totalAds / ADS_PER_TASK);

    if (user.claimedTasks.includes(taskIndex)) {
      return res.status(400).json({ error: "Already claimed" });
    }

    // 💰 reward calculation (60%)
    const reward = REWARD_PER_TASK * 0.6;

    user.balance += reward;
    user.claimedTasks.push(taskIndex);

    await user.save();

    res.json({
      success: true,
      reward,
      balance: user.balance
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ================= CPA POSTBACK =================
/*
  🔥 PURPOSE:
  CPAGrip theke real conversion asle user ke reward add
*/

app.get("/api/postback", async (req, res) => {
  try {
    const { user_id, amount, trans_id } = req.query;

    // 🚫 missing data check
    if (!user_id || !amount || !trans_id) {
      return res.send("Invalid");
    }

    let user = await User.findOne({ userId: user_id });

    if (!user) return res.send("No user");

    // ================= FAKE PREVENT =================
    /*
      🔥 PURPOSE:
      same transaction duplicate add na hoy
    */
    const exist = await EarnLog.findOne({ source: trans_id });
    if (exist) return res.send("Duplicate");

    // ================= REAL EARNING =================
    const reward = Number(amount) * 0.6; // 60% user

    user.balance += reward;

    await user.save();

    await EarnLog.create({
      userId: user_id,
      amount: reward,
      source: trans_id
    });

    res.send("OK");

  } catch (err) {
    console.error(err);
    res.send("Error");
  }
});

// ================= DAILY RESET =================
/*
  🔥 PURPOSE:
  protidin ads count reset
*/

setInterval(async () => {
  console.log("🔄 Daily reset running...");

  await User.updateMany({}, {
    totalAds: 0,
    claimedTasks: []
  });

}, 1000 * 60 * 60 * 24); // 24 hour
