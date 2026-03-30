// ================= IMPORT =================
const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(express.json());

// ================= CONFIG =================
const ADMIN_PASS = "1234";

// ================= DB CONNECT =================
mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log("✅ DB Connected"))
.catch(err=>console.log("❌ DB Error:", err));


// ================= MODEL =================

// 👤 USER MODEL
const User = mongoose.model("User", new mongoose.Schema({
  userId: String,
  balance: { type: Number, default: 0 },

  totalAds: { type: Number, default: 0 },
  claimedTasks: { type: Array, default: [] },
  refBy: String,

  // 🔐 SECURITY
  ip: String,
  deviceId: String,
  lastWatch: Number,

  suspicious: { type: Number, default: 0 },
  blocked: { type: Boolean, default: false }
}));


// 📊 EARNING LOG (REAL TRACKING)
const EarnLog = mongoose.model("EarnLog", new mongoose.Schema({
  userId: String,
  amount: Number,
  source: String, // task / cpa
  time: { type: Date, default: Date.now }
}));


// ================= TASK CONFIG =================
const TASKS = [
  { ads: 5, reward: 0.01 },
  { ads: 10, reward: 0.02 },
  { ads: 20, reward: 0.05 }
];


// ================= FRAUD AI SYSTEM =================
async function checkFraud(user, ip, deviceId){

  if(user.blocked) return "🚫 Account Blocked";

  // 📱 Device change
  if(user.deviceId && user.deviceId !== deviceId){
    user.suspicious += 2;
  }

  // 🌍 Multiple account same IP
  let count = await User.countDocuments({ip});
  if(count > 3){
    user.suspicious += 1;
  }

  // ⚡ Fast click detect
  if(user.lastWatch && (Date.now() - user.lastWatch < 5000)){
    user.suspicious += 2;
  }

  // 🚨 AUTO BAN
  if(user.suspicious >= 5){
    user.blocked = true;
    await user.save();
    return "🚫 Fraud detected (Auto Ban)";
  }

  await user.save();
  return null;
}


// ================= STATIC FILE =================
app.use(express.static(path.join(__dirname,"web")));

app.get("/", (req,res)=>{
  res.sendFile(path.join(__dirname,"web/app.html"));
});


// ================= USER LOAD =================
app.get("/api/user/:id", async (req,res)=>{
  let { ref } = req.query;

  let user = await User.findOne({userId:req.params.id});

  if(!user){
    user = await User.create({
      userId:req.params.id,
      refBy: ref || null
    });
  }

  res.json(user);
});


// ================= WATCH AD =================
app.post("/api/watch", async (req,res)=>{
  const { id, deviceId } = req.body;

  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  let user = await User.findOne({userId:id});
  if(!user) user = await User.create({userId:id});

  // 🔥 FRAUD CHECK
  let fraud = await checkFraud(user, ip, deviceId);
  if(fraud) return res.json({success:false, msg: fraud});

  user.totalAds += 1;
  user.ip = ip;
  user.deviceId = deviceId;
  user.lastWatch = Date.now();

  await user.save();

  res.json({success:true});
});


// ================= TASK CLAIM =================
app.post("/api/taskReward", async (req,res)=>{
  const { id, index } = req.body;

  let user = await User.findOne({userId:id});
  let task = TASKS[index];

  if(!task) return res.json({success:false});

  if(user.totalAds < task.ads){
    return res.json({success:false, msg:"❌ Complete ads first"});
  }

  if(user.claimedTasks.includes(index)){
    return res.json({success:false, msg:"⚠ Already claimed"});
  }

  user.balance += task.reward;
  user.claimedTasks.push(index);

  await user.save();

  // 📊 LOG SAVE
  await EarnLog.create({
    userId: id,
    amount: task.reward,
    source: "task"
  });

  res.json({success:true, msg:"💰 Reward added"});
});


// ================= CPA POSTBACK (REAL MONEY) =================
app.get("/api/postback", async (req,res)=>{
  let { subid, payout } = req.query;

  let user = await User.findOne({userId:subid});
  if(!user) return res.send("no user");

  let total = parseFloat(payout);

  let userShare = total * 0.75;
  let adminShare = total * 0.25;

  user.balance += userShare;

  await user.save();

  await EarnLog.create({
    userId: subid,
    amount: userShare,
    source: "cpa"
  });

  console.log("💰 ADMIN PROFIT:", adminShare);

  res.send("ok");
});


// ================= GRAPH DATA =================
app.get("/api/earn-graph/:id", async (req,res)=>{
  let data = await EarnLog.find({userId:req.params.id}).limit(30);
  res.json(data);
});


// ================= INVITE SYSTEM =================
app.get("/api/invite/:id", async (req,res)=>{
  let users = await User.find({refBy:req.params.id});
  let total = await User.countDocuments();

  res.json({
    total,
    users: users.map(u=>u.userId)
  });
});


// ================= WITHDRAW =================
let withdraws = [];

app.post("/api/withdraw", (req,res)=>{
  withdraws.push({
    ...req.body,
    status: "pending",
    time: new Date()
  });

  res.json({success:true, msg:"✅ Request sent"});
});


// ================= WITHDRAW HISTORY =================
app.get("/api/withdraw/history", (req,res)=>{
  res.json(withdraws);
});


// ================= ADMIN PANEL =================
app.get("/api/admin/withdraws", (req,res)=>{
  if(req.query.pass !== ADMIN_PASS) return res.json([]);
  res.json(withdraws);
});

app.post("/api/admin/approve", async (req,res)=>{
  const { index, pass } = req.body;

  if(pass !== ADMIN_PASS) return res.json({success:false});

  let w = withdraws[index];
  if(!w || w.status !== "pending") return res.json({success:false});

  let user = await User.findOne({userId:w.id});

  if(user){
    user.balance -= parseFloat(w.amount);
    await user.save();
  }

  w.status = "approved";

  res.json({success:true});
});


// ================= ADMIN STATS =================
app.get("/api/admin/stats", async (req,res)=>{
  if(req.query.pass !== ADMIN_PASS) return res.json({});

  let totalUsers = await User.countDocuments();

  let totalEarn = await EarnLog.aggregate([
    {$group:{_id:null,total:{$sum:"$amount"}}}
  ]);

  res.json({
    users: totalUsers,
    earn: totalEarn[0]?.total || 0
  });
});


// ================= START SERVER =================
app.listen(3000,()=>console.log("🚀 Server Running"));
