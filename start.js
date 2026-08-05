try { require('dotenv').config(); } catch(e) {}

console.log('[START] Backend ishga tushmoqda...');
require('./backend/src/index.js');

const port = process.env.PORT || 4000;
const apiUrl = `http://localhost:${port}/api`;

const startCustomerBot = require('./customer-bot/bot.js');
const startCourierBot = require('./courier-bot/bot.js');

setTimeout(() => {
  console.log('[START] Mijoz Boti va Kuryer Boti ishga tushmoqda...');
  startCustomerBot(process.env.CUSTOMER_BOT_TOKEN, apiUrl);
  startCourierBot(process.env.COURIER_BOT_TOKEN, apiUrl);
}, 3000);
