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
