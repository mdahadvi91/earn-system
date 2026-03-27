const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// static folder (web)
app.use(express.static(path.join(__dirname, "web")));

// HOME ROUTE FIX 🔥
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "web", "index.html"));
});

// user system
let users = {};

// get user
app.get("/user/:id", (req, res) => {
  let id = req.params.id;
  if (!users[id]) users[id] = { balance: 0 };
  res.json(users[id]);
});

// reward
app.post("/reward", (req, res) => {
  let { id, amount } = req.body;
  if (!users[id]) users[id] = { balance: 0 };
  users[id].balance += amount;
  res.json({ success: true });
});

app.listen(3000, () => console.log("Server running on 3000"));
