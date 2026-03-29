const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(express.json());

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

  lastCPA: Number
}));


// ================= CPA AUTO REWARD (SECURE) =================
const crypto = require("crypto");

// 🔐 secret (নিজে change করবা)
const CPA_SECRET = "Hridoyvi@24423";

let cpaLogs = [];

app.get("/api/cpa", async (req, res) => {
  try {
    const { user_id, amount, hash } = req.query;

    if (!user_id || !amount) {
      return res.send("Invalid");
    }

    // 🔐 hash verify (security)
    const checkHash = crypto
      .createHash("md5")
      .update(user_id + amount + CPA_SECRET)
      .digest("hex");

    if (hash && hash !== checkHash) {
      return res.send("❌ Invalid hash");
    }

    let user = await User.findOne({ userId: user_id });
    if (!user) user = await User.create({ userId: user_id });

    const reward = parseFloat(amount);

    // 🚫 max limit per offer
    if (reward > 5) {
      return res.send("❌ Too high");
    }

    // 🚫 duplicate protection (same amount within 10 sec)
    const now = Date.now();
    if (user.lastCPA && (now - user.lastCPA < 10000)) {
      return res.send("⚠ Too fast");
    }

    user.balance += reward;
    user.lastCPA = now;

    await user.save();

    // 🧾 log save
    cpaLogs.push({
      user: user_id,
      amount: reward,
      time: new Date()
    });

    console.log("💰 CPA:", user_id, reward);

    res.send("OK");

  } catch (err) {
    console.log("❌ CPA ERROR:", err);
    res.send("ERROR");
  }
});

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

    // referral bonus
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

  // cooldown
  if(user.lastClaim && (now - user.lastClaim < 20000)){
    return res.json({success:false, msg:"⏳ Wait 20 sec"});
  }

  // daily limit
  if(user.dailyEarn >= 0.05){
    return res.json({success:false, msg:"🚫 Daily limit"});
  }

  // suspicious
  if(user.totalAds > 0 && (now - user.lastClaim < 5000)){
    return res.json({success:false, msg:"⚠ Suspicious activity"});
  }

  const reward = (Math.random()*0.002 + 0.001);

  user.balance += reward;
  user.dailyEarn += reward;
  user.totalAds += 1;
  user.lastClaim = now;

  // save tracking
  user.ip = ip;
  user.device = device;

  await user.save();

  res.json({
    success:true,
    msg:`💰 ${reward.toFixed(4)} USDT added`
  });
});

// ================= WITHDRAW =================
let withdraws = [];

app.post("/api/withdraw", async (req,res)=>{
  const { id, amount, address } = req.body;

  let user = await User.findOne({userId:id});

  const amt = parseFloat(amount);

  if(!user || user.balance < amt){
    return res.json({success:false, msg:"❌ Low balance"});
  }

  if(amt < 1){
    return res.json({success:false, msg:"⚠ Min 1 USDT"});
  }

  user.balance -= amt;
  await user.save();

  withdraws.push({
    id,
    amount: amt,
    address,
    status:"pending",
    time: new Date()
  });

  res.json({success:true, msg:"✅ Withdraw request sent"});
});

// ================= ADMIN =================
const ADMIN_PASS = process.env.ADMIN_PASS;

// all users
app.get("/api/admin/users", async (req,res)=>{
  if(req.query.pass !== ADMIN_PASS) return res.json([]);
  let users = await User.find().sort({balance:-1}).limit(100);
  res.json(users);
});

// single user
app.get("/api/admin/user/:id", async (req,res)=>{
  if(req.query.pass !== ADMIN_PASS) return res.json({});
  let user = await User.findOne({userId:req.params.id});
  res.json(user);
});

// withdraw list
app.get("/api/admin/withdraws",(req,res)=>{
  if(req.query.pass !== ADMIN_PASS) return res.json([]);
  res.json(withdraws);
});

// approve
app.post("/api/admin/approve", async (req,res)=>{
  const { index, pass } = req.body;

  if(pass !== ADMIN_PASS) return res.json({success:false});

  if(!withdraws[index]) return res.json({success:false});

  withdraws[index].status = "approved";
  res.json({success:true});
});

// reject
app.post("/api/admin/reject", async (req,res)=>{
  const { index, pass } = req.body;

  if(pass !== ADMIN_PASS) return res.json({success:false});

  let w = withdraws[index];
  if(!w) return res.json({success:false});

  let user = await User.findOne({userId:w.id});
  if(user){
    user.balance += w.amount;
    await user.save();
  }

  w.status = "rejected";

  res.json({success:true});
});

// ================= LEADERBOARD =================

// top earners
app.get("/api/leaderboard", async (req,res)=>{
  let users = await User.find().sort({balance:-1}).limit(20);
  res.json(users);
});

// top referrals
app.get("/api/leaderboard/ref", async (req,res)=>{
  let users = await User.find().sort({referrals:-1}).limit(20);
  res.json(users);
});

// ================= OFFERWALL =================

app.get("/api/offers",(req,res)=>{
  res.json([
    {
      title: "📱 Install App & Earn",
      reward: 0.10,
      link: "https://your-offer-link-1.com"
    },
    {
      title: "📝 Signup & Earn",
      reward: 0.20,
      link: "https://your-offer-link-2.com"
    },
    {
      title: "🎮 Play Game",
      reward: 0.15,
      link: "https://your-offer-link-3.com"
    }
  ]);
});

// ================= AUTO OFFER POSTBACK =================

app.get("/api/postback", async (req,res)=>{
  try{
    let { user, reward } = req.query;

    if(!user || !reward){
      return res.send("Missing data");
    }

    let u = await User.findOne({userId:user});
    if(!u){
      return res.send("User not found");
    }

    let amount = parseFloat(reward);

    // 💰 give reward (75% user)
    let userEarn = amount * 0.75;

    u.balance += userEarn;
    await u.save();

    console.log("✅ Offer reward added:", user, userEarn);

    res.send("OK");
  }catch(e){
    res.send("Error");
  }
});

// ================= CPA LOGS (ADMIN) =================
app.get("/api/admin/cpa", (req, res) => {
  if (req.query.pass !== ADMIN_PASS) {
    return res.json([]);
  }

  res.json(cpaLogs.reverse());
});

// ================= BOT =================
const bot = require("./bot");
app.use(bot);

// ================= START =================
app.listen(3000,()=>console.log("🚀 Server Running"));
