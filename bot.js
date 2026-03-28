const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const fetch = require("node-fetch");

const router = express.Router();

// ================= SECURE CONFIG =================
const TOKEN = process.env.BOT_TOKEN;
const URL = process.env.APP_URL;

// safety check
if (!TOKEN) {
  console.log("❌ BOT_TOKEN missing");
  process.exit(1);
}

// ================= BOT INIT =================
const bot = new TelegramBot(TOKEN);

bot.setWebHook(`${URL}/bot${TOKEN}`);

// ================= WEBHOOK =================
router.post(`/bot${TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// ================= START =================
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id,
`💰 Welcome to Earn Pro

👇 Start earning now`,
  {
    reply_markup: {
      inline_keyboard: [[
        {
          text: "🚀 Open Dashboard",
          web_app: { url: URL }
        }
      ]]
    }
  });
});

// ================= BALANCE =================
bot.onText(/\/balance/, (msg) => {
  fetch(`${URL}/user/${msg.chat.id}`)
  .then(res => res.json())
  .then(data => {
    bot.sendMessage(msg.chat.id, `💰 Balance: ${data.balance}`);
  })
  .catch(()=>{
    bot.sendMessage(msg.chat.id, "❌ Server error");
  });
});

module.exports = router;
