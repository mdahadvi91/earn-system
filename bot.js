const TelegramBot = require("node-telegram-bot-api");
const express = require("express");

const router = express.Router();

const bot = new TelegramBot(process.env.BOT_TOKEN);

bot.setWebHook(`${process.env.APP_URL}/bot${process.env.BOT_TOKEN}`);

router.post(`/bot${process.env.BOT_TOKEN}`, (req,res)=>{
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// start
bot.onText(/\/start (.+)/, (msg, match)=>{
  const ref = match[1];

  bot.sendMessage(msg.chat.id,
`💰 Earn Pro

Start earning 👇`,
  {
    reply_markup:{
      inline_keyboard:[[
        {
          text:"🚀 Open App",
          web_app:{url: process.env.APP_URL + "?ref=" + ref}
        }
      ]]
    }
  });
});

bot.onText(/\/start/, (msg)=>{
  bot.sendMessage(msg.chat.id,
`💰 Earn Pro`,
  {
    reply_markup:{
      inline_keyboard:[[
        {
          text:"🚀 Open App",
          web_app:{url: process.env.APP_URL}
        }
      ]]
    }
  });
});

module.exports = router;
