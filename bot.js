const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const fetch = require("node-fetch");

const router = express.Router();

const TOKEN = process.env.BOT_TOKEN;
const URL = process.env.APP_URL;

const bot = new TelegramBot(TOKEN);

// webhook
bot.setWebHook(`${URL}/bot${TOKEN}`);

// webhook route
router.post(`/bot${TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// start
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id,
`💰 Welcome to Earn Pro

👇 Start earning`,
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

// balance
bot.onText(/\/balance/, (msg) => {
  fetch(`${URL}/user/${msg.chat.id}`)
  .then(res => res.json())
  .then(data => {
    bot.sendMessage(msg.chat.id, `💰 Balance: ${data.balance}`);
  })
  .catch(()=>{
    bot.sendMessage(msg.chat.id, "❌ Server not connected");
  });
});

module.exports = router;

bot.onText(/\/ref/, (msg) => {
  const link = `${URL}?ref=${msg.chat.id}`;
  bot.sendMessage(msg.chat.id, "Invite:\n"+link);
});
