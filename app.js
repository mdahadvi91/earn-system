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
