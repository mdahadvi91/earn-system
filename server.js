// ================= CONFIG =================
const MAX_ADS_PER_DAY = 50;     // দিনে max ad
const ADS_PER_TASK = 5;         // 5 ad = 1 task
const REWARD_PER_TASK = 2;      // প্রতি task reward
const AD_TIMER = 15000;         // 15 sec delay

// ================= IMPORT =================
const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");

const app = express();

// ================= SAFETY =================
process.on("uncaughtException", err => console.log(err));
process.on("unhandledRejection", err => console.log(err));

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json());

// ================= DB CONNECT =================
mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log("✅ DB Connected"))
.catch(err=>console.log(err));

// ================= MODELS =================
const User = mongoose.model("User", new mongoose.Schema({
  userId:String,
  balance:{type:Number,default:0},
  totalAds:{type:Number,default:0},
  claimedTasks:{type:Array,default:[]},
  deviceId:String,
  lastWatch:Number
}));

// ================= STATIC =================
app.use(express.static(path.join(__dirname,"public")));

// ================= ROUTES =================

// Home
app.get("/",(req,res)=>{
  res.sendFile(path.join(__dirname,"public/index.html"));
});

// Task page
app.get("/task",(req,res)=>{
  res.sendFile(path.join(__dirname,"public/pages/task.html"));
});

// Health check
app.get("/health",(req,res)=>res.send("OK"));

// ================= USER =================
// user create / get
app.get("/api/user/:id", async (req,res)=>{
  let user = await User.findOne({userId:req.params.id});

  if(!user){
    user = await User.create({userId:req.params.id});
  }

  res.json(user);
});

// ================= WATCH AD =================
app.post("/api/watch-ad", async (req,res)=>{
  try{
    const {userId,deviceId} = req.body;

    if(!userId || !deviceId){
      return res.status(400).json({error:"Missing data"});
    }

    let user = await User.findOne({userId});
    if(!user) return res.status(404).json({error:"User not found"});

    const now = Date.now();

    // ⛔ fast click block
    if(user.lastWatch && now - user.lastWatch < AD_TIMER){
      return res.status(400).json({error:"Wait for timer"});
    }

    // ⛔ daily limit
    if(user.totalAds >= MAX_ADS_PER_DAY){
      return res.json({message:"Daily limit reached"});
    }

    // ✅ update
    user.totalAds += 1;
    user.lastWatch = now;
    user.deviceId = deviceId;

    await user.save();

    res.json({success:true,totalAds:user.totalAds});

  }catch(err){
    console.log(err);
    res.status(500).json({error:"Server error"});
  }
});

// ================= CLAIM =================
app.post("/api/claim-task", async (req,res)=>{
  try{
    const {userId} = req.body;

    let user = await User.findOne({userId});
    if(!user) return res.status(404).json({error:"User not found"});

    if(user.totalAds < ADS_PER_TASK){
      return res.status(400).json({error:"Watch 5 ads first"});
    }

    // ✅ FIXED logic
    const taskIndex = Math.floor((user.totalAds - 1) / ADS_PER_TASK);

    if(user.claimedTasks.includes(taskIndex)){
      return res.status(400).json({error:"Already claimed"});
    }

    const reward = REWARD_PER_TASK;

    user.balance += reward;
    user.claimedTasks.push(taskIndex);

    await user.save();

    res.json({success:true,reward,balance:user.balance});

  }catch(err){
    console.log(err);
    res.status(500).json({error:"Server error"});
  }
});

// ================= SERVER =================
const PORT = process.env.PORT || 10000;

app.listen(PORT, ()=>console.log("🚀 Server running on",PORT));
