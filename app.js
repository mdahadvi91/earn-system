const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

// 🔥 static folder fix
const webPath = path.join(__dirname, "web");
app.use(express.static(webPath));

// 🔥 force index.html load
app.get("/", (req, res) => {
  res.sendFile(path.join(webPath, "index.html"));
});

// test route (debug)
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

require("./bot");
app.listen(3000, () => console.log("Server running..."));
