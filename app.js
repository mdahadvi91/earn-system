const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

// static
const webPath = path.join(__dirname, "web");
app.use(express.static(webPath));

// home
app.get("/", (req, res) => {
  res.sendFile(path.join(webPath, "index.html"));
});

// test
app.get("/test", (req, res) => {
  res.send("Server OK");
});

// user system
let users = {};

app.get("/user/:id", (req, res) => {
  let id = req.params.id;
  if (!users[id]) users[id] = { balance: 0 };
  res.json(users[id]);
});

app.post("/reward", (req, res) => {
  let { id, amount } = req.body;
  if (!users[id]) users[id] = { balance: 0 };
  users[id].balance += amount;
  res.json({ success: true });
});

// 🔥 bot connect
const botRoutes = require("./bot");
app.use(botRoutes);

app.listen(3000, () => console.log("Server running..."));


const mongoose = require("mongoose");

mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log("MongoDB Connected"))
.catch(err=>console.log(err));

// ================= WITHDRAW REQUEST =================
let withdraws = [];

app.post("/withdraw", (req, res) => {
  const { id, amount, method, number } = req.body;

  if (!id || !amount || !method || !number) {
    return res.json({ error: "Missing data" });
  }

  if (amount < 10) {
    return res.json({ error: "Minimum withdraw 10 BDT" });
  }

  if (!users[id] || users[id].balance < amount) {
    return res.json({ error: "Insufficient balance" });
  }

  // balance cut
  users[id].balance -= amount;

  // save request
  withdraws.push({
    id,
    amount,
    method,
    number,
    status: "pending"
  });

  res.json({ success: true });
});


// ================= GET WITHDRAW (ADMIN) =================
app.get("/withdraws", (req, res) => {
  res.json(withdraws);
});
