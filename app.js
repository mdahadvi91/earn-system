const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(express.json());

// 🔐 ADMIN PASS
const ADMIN_PASS = process.env.ADMIN_PASS;

// ================= DB =================
mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log("✅ DB Connected"))
.catch(err=>console.log("❌ DB Error:", err));

// ================= MODEL =================
const User = mongoose.model("User", new mongoose.Schema({
  userId: String,
  balance: { type: Number, default: 0 },
  referrals: { type: Number, default: 0 },
  refBy: String,
  lastClaim: Number,
  dailyEarn: { type: Number, default: 0 },
  lastDay: String,
  totalAds: { type: Number, default: 0 },
  ip: String,
  device: String,
  lastCPA: Number,

  suspicious: { type: Number, default: 0 },
  blocked: { type: Boolean, default: false }
}));

async function checkFraud(user, ip){
  // 🚫 blocked user
  if(user.blocked){
    return "🚫 Account blocked";
  }

  // 🚫 same IP too many users
  let count = await User.countDocuments({ip: ip});
  if(count > 3){
    user.suspicious += 1;
  }

  // 🚫 too fast click
  if(user.lastClaim && (Date.now() - user.lastClaim < 5000)){
    user.suspicious += 1;
  }

  // 🚫 too many ads in short time
  if(user.totalAds > 50 && user.dailyEarn < 0.01){
    user.suspicious += 1;
  }

  // 🚫 auto block
  if(user.suspicious >= 5){
    user.blocked = true;
    await user.save();
    return "🚫 Suspicious activity blocked";
  }

  await user.save();
  return null;
}


// ================= STATIC =================
app.use(express.static(path.join(__dirname,"web")));
app.get("/", (req,res)=>{
  res.sendFile(path.join(__dirname,"web/app.html"));
});

// ================= USER =================
app.get("/api/user/:id", async (req,res)=>{
  let { ref } = req.query;
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  let user = await User.findOne({userId:req.params.id});

  if(!user){
    user = await User.create({
      userId:req.params.id,
      refBy: ref || null,
      ip: ip
    });

    if(ref && ref !== req.params.id){
      let r = await User.findOne({userId:ref});
      if(r){
        r.balance += 0.02;
        r.referrals += 1;
        await r.save();
      }
    }
  }

  res.json(user);
});

// ================= REWARD =================
app.post("/api/reward", async (req,res)=>{
  const { id, device } = req.body;

  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  let user = await User.findOne({userId:id});
  if(!user) user = await User.create({userId:id});

  const now = Date.now();
  const today = new Date().toDateString();

  if(user.lastDay !== today){
    user.dailyEarn = 0;
    user.lastDay = today;
  }

  if(user.lastClaim && (now - user.lastClaim < 20000)){
    return res.json({success:false, msg:"⏳ Wait 20 sec"});
  }

  if(user.dailyEarn >= 0.05){
    return res.json({success:false, msg:"🚫 Daily limit"});
  }

  const reward = (Math.random()*0.002 + 0.001);

  user.balance += reward;
  user.dailyEarn += reward;
  user.totalAds += 1;
  user.lastClaim = now;
  user.ip = ip;
  user.device = device;

  await user.save();

  res.json({
    success:true,
    msg:`💰 ${reward.toFixed(4)} USDT added`
  });
});

// ================= WITHDRAW SYSTEM =================
let withdraws = [];

// request
app.post("/api/withdraw", async (req,res)=>{
  const { id, amount, method, account } = req.body;

  let user = await User.findOne({userId:id});
  let amt = parseFloat(amount);

  if(!user || user.balance < amt){
    return res.json({success:false, msg:"❌ Low balance"});
  }

  if(amt < 1){
    return res.json({success:false, msg:"⚠ Min 1 USDT"});
  }

  withdraws.push({
    id,
    amount: amt,
    method,
    account,
    ads: user.totalAds,
    status: "pending",
    time: new Date()
  });

  console.log("💸 REQUEST:", id, amt, method);

  res.json({success:true, msg:"✅ Request sent"});
});

// get list
app.get("/api/admin/withdraws",(req,res)=>{
  if(req.query.pass !== ADMIN_PASS) return res.json([]);
  res.json(withdraws);
});

// approve
app.post("/api/admin/approve", async (req,res)=>{
  const { index, pass } = req.body;

  if(pass !== ADMIN_PASS) return res.json({success:false});

  let w = withdraws[index];
  if(!w || w.status !== "pending") return res.json({success:false});

  let user = await User.findOne({userId:w.id});

  if(user){
    user.balance -= w.amount;
    await user.save();
  }

  w.status = "approved";

  console.log("✅ APPROVED:", w.id, w.amount);

  res.json({success:true});
});

// reject
app.post("/api/admin/reject", (req,res)=>{
  const { index, pass } = req.body;

  if(pass !== ADMIN_PASS) return res.json({success:false});

  let w = withdraws[index];
  if(!w) return res.json({success:false});

  w.status = "rejected";

  res.json({success:true});
});

// ================= LEADERBOARD =================
app.get("/api/leaderboard", async (req,res)=>{
  let users = await User.find().sort({balance:-1}).limit(20);
  res.json(users);
});

// ================= BOT =================
const bot = require("./bot");
app.use(bot);

// ================= START =================
app.listen(3000,()=>console.log("🚀 Server Running"));
