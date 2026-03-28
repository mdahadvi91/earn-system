const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");

const app = express();

app.use(cors());
app.use(express.json());


// ================= MONGODB =================
mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log("✅ MongoDB Connected"))
.catch(err=>console.log("❌ DB Error:", err));


// ================= SCHEMA =================
const UserSchema = new mongoose.Schema({
  userId: String,
  balance: { type: Number, default: 0 }
});

const User = mongoose.model("User", UserSchema);


// ================= STATIC =================
const webPath = path.join(__dirname, "web");
app.use(express.static(webPath));

app.get("/", (req, res) => {
  res.sendFile(path.join(webPath, "index.html"));
});

app.get("/test", (req, res) => {
  res.send("Server OK");
});


// ================= USER =================
app.get("/user/:id", async (req, res) => {
  let user = await User.findOne({ userId: req.params.id });

  if (!user) {
    user = await User.create({ userId: req.params.id });
  }

  res.json(user);
});

app.post("/reward", async (req, res) => {
  const { id, amount } = req.body;

  let user = await User.findOne({ userId: id });

  if (!user) {
    user = await User.create({ userId: id });
  }

  user.balance += amount;
  await user.save();

  res.json({ success: true });
});


// ================= WITHDRAW =================
let withdraws = [];

app.post("/withdraw", async (req, res) => {
  const { id, amount, method, number } = req.body;

  let user = await User.findOne({ userId: id });

  if (!user || user.balance < amount) {
    return res.json({ error: "Insufficient balance" });
  }

  // deduct balance
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

// get withdraws
app.get("/admin/withdraws", (req, res) => {
  if (req.query.pass !== ADMIN_PASS) {
    return res.json([]);
  }
  res.json(withdraws);
});

// approve withdraw
app.post("/admin/approve", async (req, res) => {
  const { index, pass } = req.body;

  if (pass !== ADMIN_PASS) {
    return res.json({ error: "Unauthorized" });
  }

  if (!withdraws[index]) {
    return res.json({ error: "Invalid" });
  }

  withdraws[index].status = "approved";

  res.json({ success: true });
});

// reject withdraw
app.post("/admin/reject", async (req, res) => {
  const { index, pass } = req.body;

  if (pass !== ADMIN_PASS) {
    return res.json({ error: "Unauthorized" });
  }

  let w = withdraws[index];

  if (!w) {
    return res.json({ error: "Invalid" });
  }

  // refund
  let user = await User.findOne({ userId: w.id });
  if (user) {
    user.balance += w.amount;
    await user.save();
  }

  w.status = "rejected";

  res.json({ success: true });
});


// ================= BOT =================
const botRoutes = require("./bot");
app.use(botRoutes);


// ================= START =================
app.listen(3000, () => console.log("🚀 Server running..."));
