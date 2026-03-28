const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const router = express.Router();

// ================= CONFIG =================
const TOKEN = "8555805163:AAGG7DP1HggZZCWtl1ZCarbg4jQy9t-lGoI";
const URL = "https://earn-system.onrender.com";

// ================= BOT INIT =================
const bot = new TelegramBot(TOKEN);

// webhook set
bot.setWebHook(`${URL}/bot${TOKEN}`);

// ================= WEBHOOK ROUTE =================
router.post(`/bot${TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// ================= START COMMAND =================
bot.onText(/\/start/, (msg) => {

  bot.sendMessage(msg.chat.id,
`💰 Welcome to Earn Pro System

📺 Watch Ads & Earn Money
👥 Invite Friends & Get Bonus
💸 Withdraw Anytime

👇 Click below to start earning`,
  {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "🚀 Open Dashboard",
            web_app: {
              url: URL
            }
          }
        ],
        [
          {
            text: "💰 Check Balance",
            callback_data: "balance"
          }
        ]
      ]
    }
  });

});

// ================= BALANCE BUTTON =================
bot.on("callback_query", (query) => {

  if(query.data === "balance"){

    fetch(`${URL}/user/${query.from.id}`)
    .then(res => res.json())
    .then(data => {

      bot.answerCallbackQuery(query.id);

      bot.sendMessage(query.message.chat.id,
        `💰 Your Balance: ${data.balance} BDT`
      );

    })
    .catch(() => {
      bot.sendMessage(query.message.chat.id, "❌ Server error");
    });

  }

});

// ================= COMMAND BALANCE =================
bot.onText(/\/balance/, (msg) => {

  fetch(`${URL}/user/${msg.chat.id}`)
  .then(res => res.json())
  .then(data => {

    bot.sendMessage(msg.chat.id,
      `💰 Your Balance: ${data.balance} BDT`
    );

  })
  .catch(()=>{
    bot.sendMessage(msg.chat.id, "❌ Server error");
  });

});

// ================= ERROR HANDLING =================
bot.on("polling_error", (err) => {
  console.log(err);
});

module.exports = router;
