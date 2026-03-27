const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

let users = {};

app.get("/", (req, res) => {
  res.send("Server Running ✅");
});

app.get("/user/:id", (req, res) => {
  const id = req.params.id;
  if (!users[id]) users[id] = { balance: 0 };
  res.json(users[id]);
});

app.post("/reward", (req, res) => {
  const { id, amount } = req.body;
  if (!users[id]) users[id] = { balance: 0 };
  users[id].balance += amount;
  res.json({ success: true });
});

app.listen(3000, () => console.log("Server started"));
