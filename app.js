const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");

const app = express();

app.use(cors());
app.use(express.json());

// ================= DB =================
mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log("✅ MongoDB Connected"))
.catch(err=>console.log("❌ DB Error:", err));

// ================= SCHEMA =================
const UserSchema = new mongoose.Schema({
  userId: String,
  balance: { type: Number, default: 0 },

  refBy: String,
  referrals: { type: Number, default: 0 },

  ip: String,
  device: String,

  lastClaim: { type: Number, default: 0 },
  dailyEarn: { type: Number, default: 0 },
  lastDay: String,

  banned: { type: Boolean, default: false }
});

const User = mongoose.model("User", UserSchema);

// ================= STATIC =================
const webPath = path.join(__dirname, "web");
app.use(express.static(webPath));

app.get("/", (req,res)=>res.sendFile(path.join(webPath,"index.html")));

// ================= USER =================
app.get("/user/:id", async (req, res) => {
  let { ref } = req.query;

  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const device = req.headers["user-agent"];

  let user = await User.findOne({ userId: req.params.id });

  if (!user) {
    user = await User.create({
      userId: req.params.id,
      refBy: ref || null,
      ip,
      device
    });

    if (ref && ref !== req.params.id) {
      let refUser = await User.findOne({ userId: ref });

      if (refUser && refUser.ip !== ip) {
        refUser.balance += 3;
        refUser.referrals += 1;
        await refUser.save();
      }
    }
  }

  res.json(user);
});

// ================= REWARD =================
app.post("/reward", async (req, res) => {
  const { id } = req.body;

  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const device = req.headers["user-agent"];

  let user = await User.findOne({ userId: id });
  if (!user) user = await User.create({ userId: id, ip, device });

  if (user.banned) return res.json({ error: "Banned 🚫" });

  // multi detect
  const multi = await User.findOne({ ip, device, userId: { $ne: id } });
  if (multi) {
    user.banned = true;
    await user.save();
    return res.json({ error: "Cheat 🚫" });
  }

  const now = Date.now();
  const today = new Date().toDateString();

  if (user.lastDay !== today) {
    user.dailyEarn = 0;
    user.lastDay = today;
  }

  if (now - user.lastClaim < 15000) {
    return res.json({ error: "Wait ⏳" });
  }

  if (user.dailyEarn >= 100) {
    return res.json({ error: "Daily limit 🚫" });
  }

  user.balance += 1;
  user.dailyEarn += 1;
  user.lastClaim = now;

  await user.save();

  res.json({ success: true });
});

// ================= WITHDRAW =================
let withdraws = [];

app.post("/withdraw", async (req, res) => {
  const { id, amount, method, number } = req.body;

  let user = await User.findOne({ userId: id });

  if (!user || user.balance < amount) {
    return res.json({ error: "Low balance" });
  }

  if (amount < 50) {
    return res.json({ error: "Min 50" });
  }

  user.balance -= amount;
  await user.save();

  withdraws.push({
    id,
    amount,
    method,
    number,
    status: "pending"
  });

  res.json({ success: true });
});

// ================= ADMIN =================
const ADMIN_PASS = process.env.ADMIN_PASS || "24423";

app.get("/admin/withdraws", (req, res) => {
  if (req.query.pass !== ADMIN_PASS) return res.json([]);
  res.json(withdraws);
});

app.post("/admin/approve", (req, res) => {
  const { index, pass } = req.body;
  if (pass !== ADMIN_PASS) return res.json({ error: "No" });

  if (withdraws[index]) withdraws[index].status = "approved";

  res.json({ success: true });
});

app.post("/admin/reject", async (req, res) => {
  const { index, pass } = req.body;
  if (pass !== ADMIN_PASS) return res.json({ error: "No" });

  let w = withdraws[index];
  if (!w) return res.json({ error: "Invalid" });

  let user = await User.findOne({ userId: w.id });
  if (user) {
    user.balance += w.amount;
    await user.save();
  }

  w.status = "rejected";
  res.json({ success: true });
});

// ================= LEADERBOARD =================
app.get("/leaderboard", async (req, res) => {
  const users = await User.find().sort({ balance: -1 }).limit(50);
  res.json(users);
});

app.get("/rank/:id", async (req, res) => {
  const users = await User.find().sort({ balance: -1 });
  const index = users.findIndex(u => u.userId == req.params.id);
  res.json({ rank: index + 1 || "N/A" });
});

// ================= BOT =================
const botRoutes = require("./bot");
app.use(botRoutes);

// ================= START =================
app.listen(3000, ()=>console.log("🚀 LIVE"));
