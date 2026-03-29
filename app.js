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
  ip: String,
  device: String,
  userId: String,
  balance: { type: Number, default: 0 },
  referrals: { type: Number, default: 0 },
  refBy: String,
  lastClaim: Number,
  dailyEarn: { type: Number, default: 0 },
  lastDay: String,
  totalAds: { type: Number, default: 0 }
}));

// ================= STATIC =================
app.use(express.static(path.join(__dirname,"web")));

app.get("/", (req,res)=>{
  res.sendFile(path.join(__dirname,"web/app.html"));
});

// ================= USER =================
app.get("/api/user/:id", async (req,res)=>{
  let { ref } = req.query;

  let user = await User.findOne({userId:req.params.id});

  if(!user){
    user = await User.create({
      userId:req.params.id,
      refBy: ref || null
    });

    // 🔥 referral bonus
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
  const { id } = req.body;

  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  let user = await User.findOne({userId:id});
  if(!user) user = await User.create({userId:id});

  const now = Date.now();
  const today = new Date().toDateString();

  if(user.lastDay !== today){
    user.dailyEarn = 0;
    user.lastDay = today;
  }

  // ⏳ 20 sec cooldown
  if(user.lastClaim && (now - user.lastClaim < 20000)){
    return res.json({success:false, msg:"⏳ Wait 20 sec"});
  }

  // 🚫 daily limit
  if(user.dailyEarn >= 0.05){
    return res.json({success:false, msg:"🚫 Daily limit"});
  }

  // ⚠ suspicious
  if(user.totalAds > 0 && (now - user.lastClaim < 5000)){
    return res.json({success:false, msg:"⚠ Suspicious activity"});
  }

  const reward = (Math.random()*0.002 + 0.001);

  user.balance += reward;
  user.dailyEarn += reward;
  user.totalAds += 1;
  user.lastClaim = now;

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

  if(!user || user.balance < amount){
    return res.json({success:false, msg:"❌ Low balance"});
  }

  if(amount < 1){
    return res.json({success:false, msg:"⚠ Min 1 USDT"});
  }

  user.balance -= amount;
  await user.save();

  withdraws.push({
    id,
    amount,
    address,
    status:"pending",
    time: new Date()
  });

  res.json({success:true, msg:"✅ Withdraw request sent"});
});

// ================= ADMIN =================
const ADMIN_PASS = process.env.ADMIN_PASS || "12345";

// 🔥 all users
app.get("/api/admin/users", async (req,res)=>{
  if(req.query.pass !== ADMIN_PASS){
    return res.json([]);
  }

  let users = await User.find().sort({balance:-1}).limit(100);
  res.json(users);
});

// 🔥 single user
app.get("/api/admin/user/:id", async (req,res)=>{
  if(req.query.pass !== ADMIN_PASS){
    return res.json({});
  }

  let user = await User.findOne({userId:req.params.id});
  res.json(user);
});

// 🔥 withdraw list
app.get("/api/admin/withdraws",(req,res)=>{
  if(req.query.pass !== ADMIN_PASS){
    return res.json([]);
  }
  res.json(withdraws);
});

// ✅ approve
app.post("/api/admin/approve", async (req,res)=>{
  const { index, pass } = req.body;

  if(pass !== ADMIN_PASS){
    return res.json({success:false});
  }

  if(!withdraws[index]){
    return res.json({success:false});
  }

  withdraws[index].status = "approved";
  res.json({success:true});
});

// ❌ reject
app.post("/api/admin/reject", async (req,res)=>{
  const { index, pass } = req.body;

  if(pass !== ADMIN_PASS){
    return res.json({success:false});
  }

  let w = withdraws[index];
  if(!w){
    return res.json({success:false});
  }

  let user = await User.findOne({userId:w.id});
  if(user){
    user.balance += w.amount;
    await user.save();
  }

  w.status = "rejected";

  res.json({success:true});
});

// ================= BOT =================
const bot = require("./bot");
app.use(bot);

// ================= START =================
app.listen(3000,()=>console.log("🚀 Server Running"));
