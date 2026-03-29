const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(express.json());

// ================= DB =================
mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log("DB Connected"))
.catch(err=>console.log(err));

// ================= MODEL =================
const User = mongoose.model("User", new mongoose.Schema({
  userId: String,
  balance: { type: Number, default: 0 },

  referrals: { type: Number, default: 0 },
  refBy: String,

  lastClaim: Number,
  dailyEarn: { type: Number, default: 0 },
  lastDay: String,

  banned: { type: Boolean, default: false }
}));

// ================= STATIC =================
app.use(express.static(path.join(__dirname,"web")));

app.get("/sw.js",(req,res)=>{
  res.sendFile(path.join(__dirname,"sw.js"));
});

app.get("/", (req,res)=>{
  res.sendFile(path.join(__dirname,"web/app.html"));
});

// ================= USER =================
app.get("/user/:id", async (req,res)=>{
  let { ref } = req.query;

  let user = await User.findOne({userId:req.params.id});

  if(!user){
    user = await User.create({
      userId:req.params.id,
      refBy: ref || null
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

// ================= REWARD (ANTI-CHEAT) =================
app.post("/reward", async (req,res)=>{
  const { id } = req.body;

  let user = await User.findOne({userId:id});
  if(!user) user = await User.create({userId:id});

  if(user.banned){
    return res.json({error:"Blocked"});
  }

  const now = Date.now();
  const today = new Date().toDateString();

  if(user.lastDay !== today){
    user.dailyEarn = 0;
    user.lastDay = today;
  }

  if(user.lastClaim && (now - user.lastClaim < 15000)){
    return res.json({error:"Wait 15 sec"});
  }

  if(user.dailyEarn >= 0.05){
    return res.json({error:"Daily limit reached"});
  }

  // 🔥 random reward
  let reward = (Math.random() * 0.002 + 0.001);

  user.balance += reward;
  user.dailyEarn += reward;
  user.lastClaim = now;

  await user.save();

  res.json({success:true, reward});
});

// ================= WITHDRAW =================
let withdraws = [];

app.post("/withdraw", async (req,res)=>{
  const { id, amount, number } = req.body;

  let user = await User.findOne({userId:id});

  if(!user || user.balance < amount){
    return res.json({error:"Low balance"});
  }

  if(amount < 1){
    return res.json({error:"Min 1 USDT"});
  }

  user.balance -= amount;
  await user.save();

  withdraws.push({id, amount, number, status:"pending"});

  res.json({success:true});
});

// ================= ADMIN =================
const PASS = process.env.ADMIN_PASS;

app.get("/admin/withdraws",(req,res)=>{
  if(req.query.pass !== PASS) return res.json([]);
  res.json(withdraws);
});

// ================= BOT =================
const bot = require("./bot");
app.use(bot);

// ================= START =================
app.listen(3000,()=>console.log("Server Live 🚀"));
