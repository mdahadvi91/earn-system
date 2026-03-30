const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(express.json());

const ADMIN_PASS = "1234";

// ================= DB =================
mongoose.connect(process.env.MONGO_URI,{
  useNewUrlParser:true,
  useUnifiedTopology:true
})
.then(()=>console.log("✅ DB Connected"))
.catch(err=>console.log(err));

// ================= MODEL =================
const User = mongoose.model("User", new mongoose.Schema({
  userId:String,
  balance:{type:Number,default:0},
  totalAds:{type:Number,default:0},
  claimedTasks:{type:Array,default:[]},
  refBy:String,

  ip:String,
  deviceId:String,
  lastWatch:Number,

  suspicious:{type:Number,default:0},
  blocked:{type:Boolean,default:false},

  lastBonus:String
}));

const EarnLog = mongoose.model("EarnLog", new mongoose.Schema({
  userId:String,
  amount:Number,
  source:String,
  time:{type:Date,default:Date.now}
}));

// ================= FRAUD =================
async function checkFraud(user, ip, deviceId){

  if(user.blocked) return "🚫 Blocked";

  if(user.deviceId && user.deviceId !== deviceId){
    user.suspicious += 3;
  }

  if(user.lastWatch && (Date.now()-user.lastWatch < 8000)){
    user.suspicious += 2;
  }

  let count = await User.countDocuments({ip});
  if(count > 2){
    user.suspicious += 2;
  }

  if(user.suspicious >= 6){
    user.blocked = true;
  }

  await user.save();
  return user.blocked ? "🚫 Fraud detected" : null;
}

// ================= STATIC =================
app.use(express.static(path.join(__dirname,"web")));

app.get("/",(req,res)=>{
  res.sendFile(path.join(__dirname,"web/app.html"));
});

// ================= USER =================
app.get("/api/user/:id", async (req,res)=>{
  let user = await User.findOne({userId:req.params.id});

  if(!user){
    user = await User.create({userId:req.params.id});
  }

  res.json(user);
});

// ================= OFFER CLICK =================
app.post("/api/watch", async (req,res)=>{
  const {id,deviceId} = req.body;

  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  let user = await User.findOne({userId:id});
  if(!user) user = await User.create({userId:id});

  let fraud = await checkFraud(user, ip, deviceId);
  if(fraud) return res.json({success:false,msg:fraud});

  user.totalAds += 1;
  user.ip = ip;
  user.deviceId = deviceId;
  user.lastWatch = Date.now();

  await user.save();

  res.json({success:true});
});

// ================= POSTBACK =================
app.get("/api/postback", async (req,res)=>{
  let { subid, payout } = req.query;

  let user = await User.findOne({userId:subid});
  if(!user) return res.send("no user");

  let total = parseFloat(payout || 0);

  let userShare = total * 0.5;

  user.balance += userShare;
  await user.save();

  await EarnLog.create({
    userId:subid,
    amount:userShare,
    source:"cpa"
  });

  res.send("ok");
});

// ================= DAILY BONUS =================
app.post("/api/daily-bonus", async (req,res)=>{
  let { id } = req.body;

  let user = await User.findOne({userId:id});
  if(!user) return res.json({success:false});

  let today = new Date().toDateString();

  if(user.lastBonus === today){
    return res.json({success:false,msg:"Already claimed"});
  }

  let earnToday = await EarnLog.aggregate([
    {
      $match:{
        userId:id,
        time:{$gte:new Date(new Date().setHours(0,0,0,0))}
      }
    },
    {$group:{_id:null,total:{$sum:"$amount"}}}
  ]);

  let total = earnToday[0]?.total || 0;

  if(total < 0.2){
    return res.json({success:false,msg:"Earn 0.2$ first"});
  }

  let bonus = 0.05;

  user.balance += bonus;
  user.lastBonus = today;

  await user.save();

  await EarnLog.create({
    userId:id,
    amount:bonus,
    source:"daily"
  });

  res.json({success:true,msg:"Bonus added"});
});

// ================= LEADERBOARD =================
app.get("/api/leaderboard", async (req,res)=>{
  let top = await EarnLog.aggregate([
    {$group:{_id:"$userId",total:{$sum:"$amount"}}},
    {$sort:{total:-1}},
    {$limit:10}
  ]);

  res.json(top);
});

// ================= WITHDRAW =================
let withdraws = [];

app.post("/api/withdraw", async (req,res)=>{
  let { id, amount } = req.body;

  let user = await User.findOne({userId:id});

  if(!user || user.balance < amount){
    return res.json({success:false,msg:"Low balance"});
  }

  withdraws.push({
    ...req.body,
    status:"pending",
    time:new Date()
  });

  res.json({success:true});
});

app.get("/api/withdraw/history",(req,res)=>{
  res.json(withdraws);
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
  if(!w) return res.json({success:false});

  let user = await User.findOne({userId:w.id});

  if(user){
    user.balance -= parseFloat(w.amount);
    await user.save();
  }

  w.status="approved";

  res.json({success:true});
});

// ================= START =================
app.listen(3000,()=>console.log("🚀 Running on 3000"));
