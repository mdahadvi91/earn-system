const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(express.json());

const ADMIN_PASS = "1234";

mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log("DB Connected"))
.catch(()=>console.log("DB Error"));

const User = mongoose.model("User", new mongoose.Schema({
  userId:String,
  balance:{type:Number,default:0},
  totalAds:{type:Number,default:0},
  claimedTasks:{type:Array,default:[]},
  deviceId:String,
  blocked:{type:Boolean,default:false},
  vip:{type:Boolean,default:false}
}));

const EarnLog = mongoose.model("EarnLog", new mongoose.Schema({
  userId:String,
  amount:Number,
  time:{type:Date,default:Date.now}
}));

const TASKS=[
 {ads:5,reward:0.01},
 {ads:10,reward:0.02},
 {ads:20,reward:0.05}
];

app.use(express.static(path.join(__dirname,"web")));
app.get("/",(req,res)=>res.sendFile(path.join(__dirname,"web/app.html")));

app.get("/api/user/:id", async (req,res)=>{
 let user=await User.findOne({userId:req.params.id});
 if(!user) user=await User.create({userId:req.params.id});
 res.json(user);
});

app.post("/api/watch", async (req,res)=>{
 let {id,deviceId}=req.body;
 let user=await User.findOne({userId:id});
 if(!user) user=await User.create({userId:id});

 if(user.blocked) return res.json({success:false});

 user.totalAds++;
 if(!user.deviceId) user.deviceId=deviceId;

 await user.save();
 res.json({success:true});
});

app.post("/api/taskReward", async (req,res)=>{
 let {id,index}=req.body;
 let user=await User.findOne({userId:id});
 let task=TASKS[index];

 if(user.totalAds<task.ads) return res.json({success:false,msg:"Complete ads"});
 if(user.claimedTasks.includes(index)) return res.json({success:false,msg:"Claimed"});

 let reward=task.reward;
 if(user.vip) reward*=2;

 user.balance+=reward;
 user.claimedTasks.push(index);

 await user.save();
 await EarnLog.create({userId:id,amount:reward});

 res.json({success:true,msg:"Reward added"});
});

app.post("/api/vip", async (req,res)=>{
 let user=await User.findOne({userId:req.body.id});
 if(user.balance<1) return res.json({success:false,msg:"Need 1 USDT"});

 user.balance-=1;
 user.vip=true;
 await user.save();

 res.json({success:true,msg:"VIP Activated"});
});

app.get("/api/earn-graph/:id", async (req,res)=>{
 let data=await EarnLog.find({userId:req.params.id}).limit(50);
 res.json(data);
});

app.get("/api/postback", async (req,res)=>{
 let {subid,payout}=req.query;
 let user=await User.findOne({userId:subid});
 if(!user) return res.send("no user");

 let earn=payout*0.75;
 user.balance+=earn;

 await user.save();
 await EarnLog.create({userId:subid,amount:earn});

 res.send("ok");
});

let withdraws=[];

app.post("/api/withdraw", async (req,res)=>{
 let {id,amount,method,account}=req.body;
 let user=await User.findOne({userId:id});

 if(user.balance<amount) return res.json({success:false,msg:"Low balance"});

 withdraws.push({id,amount,method,account,status:"pending"});
 res.json({success:true,msg:"Request sent"});
});

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

app.listen(3000,()=>console.log("Server Running"));
