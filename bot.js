const TelegramBot = require("node-telegram-bot-api");

const TOKEN = "8555805163:AAGG7DP1HggZZCWtl1ZCarbg4jQy9t-lGoI";

// 🔥 তোমার Render URL
const URL = "https://earn-system.onrender.com";

const bot = new TelegramBot(TOKEN);

// webhook set
bot.setWebHook(`${URL}/bot${TOKEN}`);

// webhook route handle
const express = require("express");
const app = express();

app.use(express.json());

app.post(`/bot${TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// start command
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "🚀 Welcome!", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "💰 Open Dashboard", url: URL }]
      ]
    }
  });
});

app.listen(3001, () => console.log("Bot running"));
