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
.catch(err=>console.log(err));

// schema
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

  user.balance -= amount;
  await user.save();

  withdraws.push({ id, amount, method, number, status: "pending" });

  res.json({ success: true });
});

app.get("/withdraws", (req, res) => {
  res.json(withdraws);
});

// ===== ADMIN LOGIN =====
const ADMIN_PASS = process.env.ADMIN_PASS;

app.post("/admin/login", (req,res)=>{
  const {password} = req.body;

  if(password === ADMIN_PASS){
    return res.json({success:true});
  }

  res.json({error:"Wrong password"});
});

// ===== ADMIN USERS =====
app.get("/admin/users", async (req,res)=>{
  let users = await User.find();
  res.json(users);
});

// ===== ADMIN WITHDRAWS =====
app.get("/admin/withdraws", (req,res)=>{
  res.json(withdraws);
});

// ===== APPROVE WITHDRAW =====
app.post("/admin/approve", (req,res)=>{
  const {index} = req.body;

  if(withdraws[index]){
    withdraws[index].status = "approved";
    return res.json({success:true});
  }

  res.json({error:"Invalid"});
});

// ================= BOT ROUTE =================
const botRoutes = require("./bot");
app.use(botRoutes);

// ================= START =================
app.listen(3000, () => console.log("🚀 Server running..."));
