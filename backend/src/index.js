require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const cron = require("node-cron");

const { initSchema, query } = require("./db");
const authRoutes = require("./routes/authRoutes");
const productsRoutes = require("./routes/products");
const customersRoutes = require("./routes/customers");
const couriersRoutes = require("./routes/couriers");
const ordersRoutes = require("./routes/orders");
const warehouseRoutes = require("./routes/warehouse");
const statsRoutes = require("./routes/stats");
const reportsRoutes = require("./routes/reports");

function initCronJobs() {
  // Serverni Render.com da 24/7 uyg'oq ushlab turish uchun har 10 daqiqada ping qilish
  cron.schedule("*/10 * * * *", async () => {
    const url = process.env.PUBLIC_URL ? `${process.env.PUBLIC_URL}/health` : `http://localhost:${PORT}/health`;
    try {
      await fetch(url);
      console.log("⚡ Keep-alive ping bajarildi");
    } catch (e) {
      console.error("Keep-alive ping xatosi:", e.message);
    }
  });

  cron.schedule("0 9 * * *", async () => {
    console.log("⏰ 09:00 - Kuryerlarga marshrut eslatmasini yuborish");
    try {
      const defaultCourierToken = "8641929454:AAFXvYRmp8xpdFQyG-jZ3hObXzdr7TuqAnY";
      const token = process.env.COURIER_BOT_TOKEN || defaultCourierToken;
      if (!token) return;
      const couriersRes = await query("SELECT * FROM couriers WHERE active = 1");
      for (const c of couriersRes.rows) {
        if (!c.telegramId) continue;
        const text = `🔔 <b>Xayrli tong, ${c.fullName}!</b>\n\nBugungi marshrutingizni tuzish uchun bot menyusidan <b>"🗺 Optimal marshrutni tuzish"</b> tugmasini bosing.`;
        try {
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: c.telegramId, text, parse_mode: "HTML" })
          });
        } catch (err) {
          console.error("Cron xabari yuborishda xatolik:", err.message);
        }
      }
    } catch (e) {
      console.error("Cron DB xatosi:", e.message);
    }

    console.log("⏰ 09:00 - Adminlarga 10 kunlik eslatmalarni yuborish");
    try {
      const defaultCustomerToken = "8696687383:AAEDnnQZ06JXmBYrYUMZme6-5zbxarxTD04";
      const adminToken = process.env.CUSTOMER_BOT_TOKEN || defaultCustomerToken;
      
      const adminsRes = await query("SELECT \"telegramId\" FROM admin_users WHERE \"telegramId\" IS NOT NULL");
      const admins = adminsRes.rows;
      if (admins.length > 0) {
        const queryText = `
          SELECT o.id, o."bottlesGiven", c."fullName", c.phone, c.address 
          FROM orders o 
          JOIN customers c ON o."customerId" = c.id
          WHERE o.status = 'done' 
            AND o.reminder_sent = 0 
            AND o."createdAt" <= NOW() - INTERVAL '10 days'
        `;
        const ordersRes = await query(queryText);
        const orders = ordersRes.rows;

        for (const order of orders) {
          for (const admin of admins) {
            const text = `📞 <b>Mijozga qo'ng'iroq qilish vaqti keldi!</b>\n\nUshbu mijozga 10 kun oldin ${order.bottlesGiven} ta suv yetkazib berilgan edi:\n👤 Ismi: ${order.fullName || "Noma'lum"}\n📞 Tel: ${order.phone || "Noma'lum"}\n🏠 Manzil: ${order.address || "Noma'lum"}\n\nIltimos, mijoz bilan bog'lanib, yangi suv kerak yoki yo'qligini aniqlang.`;
            try {
              await fetch(`https://api.telegram.org/bot${adminToken}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chat_id: admin.telegramId, text, parse_mode: "HTML" })
              });
            } catch (err) {
              console.error("Cron admin eslatma xatosi:", err.message);
            }
          }
          await query(`UPDATE orders SET reminder_sent = 1 WHERE id = $1`, [order.id]);
        }
      }
    } catch (e) {
      console.error("Cron admin eslatma DB xatosi:", e.message);
    }
  }, { timezone: "Asia/Tashkent" });
}

async function ensureAdminUser() {
  try {
    const bcrypt = require("bcryptjs");
    const existing = await query("SELECT id FROM admin_users WHERE username = 'admin'");
    if (!existing.rows.length) {
      const hash = await bcrypt.hash("admin123", 10);
      await query(
        "INSERT INTO admin_users (username, \"passwordHash\", \"fullName\", role) VALUES ($1, $2, $3, $4)",
        ["admin", hash, "Bosh Admin", "admin"]
      );
      console.log("✅ Standart admin yaratildi: admin / admin123");
    }
  } catch (e) {
    console.error("Admin yaratishda xatolik:", e.message);
  }
}

const app = express();
app.use(cors());
app.use(express.json());

// API endpointlari
app.use("/api/auth", authRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/customers", customersRoutes);
app.use("/api/couriers", couriersRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/warehouse", warehouseRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/reports", reportsRoutes);

// Admin panel statik fayllarini shu server orqali xizmat qilish
app.use(express.static(path.join(__dirname, "..", "..", "admin-panel")));

app.get("/health", (req, res) => res.json({ ok: true }));

// Xatoliklarni umumiy tutish
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Server xatosi" });
});

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    await initSchema();
    await ensureAdminUser();
    app.listen(PORT, () => {
      console.log(`✅ Backend ishga tushdi: http://localhost:${PORT}`);
      console.log(`   Admin panel: http://localhost:${PORT}/login.html`);
      initCronJobs();
    });
  } catch (e) {
    console.error("❌ Server ishga tushishda xatolik yuz berdi!");
    console.error(e);
    process.exit(1);
  }
}

start();
