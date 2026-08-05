const { spawn } = require('child_process');
const path = require('path');

// Render.com bepul rejasida hamma narsani 1 ta xizmat ichida ishga tushirish uchun
function startProcess(name, dir, script, extraEnv = {}) {
  console.log(`[START] ${name} ishga tushmoqda...`);
  const p = spawn('node', [script], { 
    cwd: path.join(__dirname, dir), 
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv } 
  });
  
  p.on('close', (code) => {
    console.log(`[EXIT] ${name} to'xtadi (kod: ${code})`);
  });
}

// Barcha xizmatlarni bitta joyda ishga tushiramiz
// Botlar backend bilan bir xil serverda bo'lgani uchun to'g'ridan-to'g'ri localhost orqali ulanadi!
startProcess('Backend', 'backend', 'src/index.js');

const port = process.env.PORT || 4000;

setTimeout(() => {
  // Render dagi bitta xizmatda ikkita bot ishlayotgani uchun tokenlarni to'g'ri taqsimlaymiz
  startProcess('Mijoz Boti', 'customer-bot', 'bot.js', { 
    API_URL: `http://localhost:${port}/api`,
    BOT_TOKEN: process.env.CUSTOMER_BOT_TOKEN 
  });
  
  startProcess('Kuryer Boti', 'courier-bot', 'bot.js', { 
    API_URL: `http://localhost:${port}/api`,
    BOT_TOKEN: process.env.COURIER_BOT_TOKEN
  });
}, 5000); // Backend to'liq ishga tushishi uchun 5 soniya kutamiz
