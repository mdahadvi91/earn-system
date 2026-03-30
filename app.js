const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(express.json());

const ADMIN_PASS = "1234";

// ===== DB =====
mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log("✅ DB Connected"))
.catch(()=>console.log("❌ DB Error"));

// ===== MODEL =====
const User = mongoose.model("User", new mongoose.Schema({
  userId:String,
  balance:{type:Number,default:0},
  totalAds:{type:Number,default:0},
  claimedTasks:{type:Array,default:[]},
  deviceId:String,
  blocked:{type:Boolean,default:false},
  vip:{type:Boolean,default:false},
  refBy:String
}));

const EarnLog = mongoose.model("EarnLog", new mongoose.Schema({
  userId:String,
  amount:Number,
  time:{type:Date,default:Date.now}
}));

// ===== TASK =====
const TASKS=[
 {ads:5,reward:0.01},
 {ads:10,reward:0.02},
 {ads:20,reward:0.05}
];

// ===== STATIC =====
app.use(express.static(path.join(__dirname,"web")));
app.get("/",(req,res)=>res.sendFile(path.join(__dirname,"web/app.html")));

// ===== USER =====
app.get("/api/user/:id", async (req,res)=>{
 let ref=req.query.ref;
 let user=await User.findOne({userId:req.params.id});

 if(!user){
  user=await User.create({
    userId:req.params.id,
    refBy:ref||null
  });
 }

 res.json(user);
});

// ===== AI CHECK =====
async function checkAI(user){
 if(user.totalAds>200 && user.balance<0.1){
   user.blocked=true;
   await user.save();
 }
}

// ===== WATCH =====
app.post("/api/watch", async (req,res)=>{
 let {id,deviceId}=req.body;

 let user=await User.findOne({userId:id});
 if(!user) user=await User.create({userId:id});

 if(user.blocked) return res.json({success:false,msg:"🚫 Blocked"});

 await checkAI(user);

 if(!user.deviceId) user.deviceId=deviceId;
 if(user.deviceId!==deviceId){
   user.blocked=true;
   await user.save();
   return res.json({success:false,msg:"🚫 Device blocked"});
 }

 user.totalAds++;
 await user.save();

 res.json({success:true});
});

// ===== TASK CLAIM =====
app.post("/api/taskReward", async (req,res)=>{
 let {id,index}=req.body;
 let user=await User.findOne({userId:id});
 let task=TASKS[index];

 if(!task) return res.json({success:false});

 if(user.totalAds<task.ads)
   return res.json({success:false,msg:"Complete ads"});

 if(user.claimedTasks.includes(index))
   return res.json({success:false,msg:"Already claimed"});

 let reward=task.reward;
 if(user.vip) reward*=2;

 user.balance+=reward;
 user.claimedTasks.push(index);

 await user.save();
 await EarnLog.create({userId:id,amount:reward});

 res.json({success:true,msg:"💰 Reward added"});
});

// ===== GRAPH =====
app.get("/api/earn-graph/:id", async (req,res)=>{
 let data=await EarnLog.find({userId:req.params.id}).limit(30);
 res.json(data);
});

// ===== INVITE =====
app.get("/api/invite/:id", async (req,res)=>{
 let users=await User.find();
 let refs=users.filter(u=>u.refBy===req.params.id);

 res.json({
  total:users.length,
  users:refs.map(u=>u.userId)
 });
});

// ===== LEADERBOARD =====
app.get("/api/leaderboard", async (req,res)=>{
 let top=await User.find().sort({balance:-1}).limit(10);
 res.json(top);
});

// ===== WITHDRAW =====
let withdraws=[];

app.post("/api/withdraw", async (req,res)=>{
 let {id,amount,method,account}=req.body;
 let user=await User.findOne({userId:id});

 if(!user || user.balance<amount)
   return res.json({success:false,msg:"Low balance"});

 withdraws.push({id,amount,method,account,status:"pending"});
 res.json({success:true,msg:"Request sent"});
});

app.get("/api/withdraw/history",(req,res)=>{
 res.json(withdraws);
});

// ===== ADMIN =====
app.get("/api/admin/withdraws",(req,res)=>{
 if(req.query.pass!==ADMIN_PASS) return res.json([]);
 res.json(withdraws);
});

app.post("/api/admin/approve", async (req,res)=>{
 let {index,pass}=req.body;
 if(pass!==ADMIN_PASS) return res.json({success:false});

 let w=withdraws[index];
 let user=await User.findOne({userId:w.id});

 user.balance-=w.amount;
 await user.save();

 w.status="approved";
 res.json({success:true});
});

// ===== START =====
app.listen(3000,()=>console.log("🚀 Server Running"));
