/* ===================================================== */
/* 🔥 BASIC SETUP */
/* ===================================================== */

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(express.json());


/* ===================================================== */
/* 🟢 ROOT CHECK */
/* ===================================================== */

app.get("/", (req, res) => {
  res.send("API Running ✅");
});


/* ===================================================== */
/* 🟢 DATABASE */
/* ===================================================== */

mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log("✅ DB Connected"))
.catch(err=>console.log(err));


/* ===================================================== */
/* 👤 USER MODEL */
/* ===================================================== */

const User = mongoose.model("User", new mongoose.Schema({
  userId: String,
  balance: { type: Number, default: 0 },
  totalAds: { type: Number, default: 0 }
}));


/* ===================================================== */
/* 📊 GET USER */
/* ===================================================== */

app.get("/api/user/:id", async (req,res)=>{

  let user = await User.findOne({userId:req.params.id});

  if(!user){
    user = await User.create({userId:req.params.id});
  }

  res.json(user);
});


/* ===================================================== */
/* 📺 WATCH AD */
/* ===================================================== */

app.post("/api/watch", async (req,res)=>{

  let { id } = req.body;

  let user = await User.findOne({userId:id});
  if(!user) user = await User.create({userId:id});

  user.totalAds += 1;

  await user.save();

  res.json({success:true});
});


/* ===================================================== */
/* 💰 CLAIM REWARD */
/* ===================================================== */

app.post("/api/claim", async (req,res)=>{

  let { id, amount } = req.body;

  let user = await User.findOne({userId:id});
  if(!user) return res.json({success:false});

  user.balance += amount;
  user.totalAds = 0;

  await user.save();

  res.json({
    success:true,
    balance:user.balance
  });
});


/* ===================================================== */
/* 🎯 OFFER POSTBACK */
/* 👉 75% USER / 25% ADMIN */
/* ===================================================== */

app.get("/api/postback", async (req,res)=>{

  let { subid, payout } = req.query;

  let user = await User.findOne({userId:subid});
  if(!user) return res.send("no user");

  let total = parseFloat(payout || 0);

  let userShare = total * 0.75;

  user.balance += userShare;

  await user.save();

  res.send("ok");
});


/* ===================================================== */
/* 💸 WITHDRAW */
/* ===================================================== */

let withdraws = [];

app.post("/api/withdraw", async (req,res)=>{

  let { id, amount, method, number } = req.body;

  let user = await User.findOne({userId:id});

  if(!user || user.balance < amount){
    return res.json({success:false, msg:"Low balance"});
  }

  withdraws.push({
    id,
    amount,
    method,
    number,
    status:"pending",
    time:new Date()
  });

  res.json({success:true});
});


/* ===================================================== */
/* 📜 WITHDRAW HISTORY */
/* ===================================================== */

app.get("/api/withdraw/history",(req,res)=>{
  res.json(withdraws);
});


/* ===================================================== */
/* 🚀 START SERVER */
/* ===================================================== */

const PORT = process.env.PORT || 3000;

app.listen(PORT,()=>{
  console.log("🚀 Server Running");
});
