const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(express.json());

// 🔐 ADMIN PASS
const ADMIN_PASS = process.env.ADMIN_PASS || "1234";

// ================= DB =================
mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log("✅ DB Connected"))
.catch(err=>console.log("❌ DB Error:", err));

// ================= MODEL =================
const User = mongoose.model("User", new mongoose.Schema({
  userId: String,
  balance: { type: Number, default: 0 },

  totalAds: { type: Number, default: 0 },
  claimedTasks: { type: Array, default: [] },

  ip: String,
  deviceId: String,

  suspicious: { type: Number, default: 0 },
  blocked: { type: Boolean, default: false }
}));

// ================= TASK CONFIG =================
let TASKS = [
  {ads:5, reward:0.01},
  {ads:10, reward:0.02},
  {ads:20, reward:0.05}
];

// ================= FRAUD CHECK =================
async function checkFraud(user, ip){
  if(user.blocked) return "🚫 Account blocked";

  let count = await User.countDocuments({ip});
  if(count > 3) user.suspicious += 1;

  if(user.suspicious >= 5){
    user.blocked = true;
    await user.save();
    return "🚫 Suspicious activity";
  }

  await user.save();
  return null;
}

// ================= DEVICE LOCK =================
async function checkDevice(user, deviceId){
  if(!deviceId) return null;

  if(!user.deviceId){
    user.deviceId = deviceId;
    await user.save();
    return null;
  }

  if(user.deviceId !== deviceId){
    user.blocked = true;
    await user.save();
    return "🚫 Multiple device not allowed";
  }

  return null;
}

// ================= STATIC =================
app.use(express.static(path.join(__dirname,"web")));

app.get("/", (req,res)=>{
  res.sendFile(path.join(__dirname,"web/app.html"));
});

// ================= USER =================
app.get("/api/user/:id", async (req,res)=>{
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  let user = await User.findOne({userId:req.params.id});

  if(!user){
    user = await User.create({
      userId:req.params.id,
      ip
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

  // fraud check
  let fraud = await checkFraud(user, ip);
  if(fraud) return res.json({success:false, msg:fraud});

  // device check
  let deviceCheck = await checkDevice(user, deviceId);
  if(deviceCheck) return res.json({success:false, msg:deviceCheck});

  user.totalAds += 1;
  user.ip = ip;

  await user.save();

  res.json({success:true});
});

// ================= TASK CLAIM =================
app.post("/api/taskReward", async (req,res)=>{
  const { id, index } = req.body;

  let user = await User.findOne({userId:id});
  if(!user) return res.json({success:false});

  let task = TASKS[index];
  if(!task) return res.json({success:false});

  if(user.totalAds < task.ads){
    return res.json({success:false, msg:"❌ Task not completed"});
  }

  if(user.claimedTasks.includes(index)){
    return res.json({success:false, msg:"⚠ Already claimed"});
  }

  user.balance += task.reward;
  user.claimedTasks.push(index);

  await user.save();

  res.json({success:true, msg:"💰 Reward added"});
});

// ================= WITHDRAW =================
let withdraws = [];

app.post("/api/withdraw", async (req,res)=>{
  const { id, amount, method, account } = req.body;

  let user = await User.findOne({userId:id});

  if(user && user.blocked){
    return res.json({success:false, msg:"🚫 Account blocked"});
  }

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

// ================= ADMIN =================
app.get("/api/admin/withdraws",(req,res)=>{
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
    user.balance -= w.amount;
    await user.save();
  }

  w.status = "approved";

  res.json({success:true});
});

app.post("/api/admin/reject", (req,res)=>{
  const { index, pass } = req.body;

  if(pass !== ADMIN_PASS) return res.json({success:false});

  let w = withdraws[index];
  if(!w) return res.json({success:false});

  w.status = "rejected";

  res.json({success:true});
});

// ================= START =================
app.listen(3000,()=>console.log("🚀 Server Running"));
