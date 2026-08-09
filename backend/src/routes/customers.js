const express = require("express");
const { query } = require("../db");
const { authMiddleware } = require("../auth");

const router = express.Router();

// Telegram bot: mijoz birinchi marta /start bosganda chaqiradi
router.post("/register", async (req, res) => {
  try {
    const { telegramId, fullName, phone, address, latitude, longitude, language, customerType, companyName, inn } = req.body;
    if (!telegramId) return res.status(400).json({ error: "telegramId majburiy" });

    // Agar mavjud bo'lsa yangilash
    const existing = await query("SELECT id FROM customers WHERE \"telegramId\" = $1", [String(telegramId)]);
    if (existing.rows.length > 0) {
      const q = `
        UPDATE customers SET
          "fullName" = COALESCE($1, "fullName"),
          phone = COALESCE($2, phone),
          address = COALESCE($3, address),
          latitude = COALESCE($4, latitude),
          longitude = COALESCE($5, longitude),
          language = COALESCE($6, language),
          "customerType" = COALESCE($7, "customerType"),
          "companyName" = COALESCE($8, "companyName"),
          inn = COALESCE($9, inn)
        WHERE "telegramId" = $10 RETURNING *
      `;
      const updated = await query(q, [fullName, phone, address, latitude, longitude, language, customerType, companyName, inn, String(telegramId)]);
      return res.json(updated.rows[0]);
    }

    // Yangi yaratish
    const q = `
      INSERT INTO customers ("telegramId", "fullName", phone, address, latitude, longitude, language, "customerType", "companyName", inn)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *
    `;
    const inserted = await query(q, [String(telegramId), fullName, phone, address, latitude, longitude, language, customerType || 'fizik', companyName, inn]);
    res.json(inserted.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Admin bot orqali qo'lda mijoz qo'shish
router.post("/manual", async (req, res) => {
  try {
    const { fullName, phone, address, latitude, longitude } = req.body;
    if (!phone) return res.status(400).json({ error: "Telefon raqam majburiy" });

    // Tekshiramiz, balki bu raqam allaqachon bazada bordir
    let phoneStr = String(phone);
    if (!phoneStr.startsWith("+")) {
      phoneStr = "+" + phoneStr.replace(/\D/g, "");
    }
    const existing = await query("SELECT * FROM customers WHERE phone = $1", [phoneStr]);
    if (existing.rows.length > 0) {
      // Agar manzil yoki lokatsiya kiritilgan bo'lsa yangilaymiz
      const cId = existing.rows[0].id;
      if (address) {
        await query("UPDATE customers SET address = $1, \"fullName\" = $2 WHERE id = $3", [address, fullName || existing.rows[0].fullName, cId]);
      }
      if (latitude && longitude) {
        await query("UPDATE customers SET latitude = $1, longitude = $2 WHERE id = $3", [latitude, longitude, cId]);
      }
      const updated = await query("SELECT * FROM customers WHERE id = $1", [cId]);
      return res.json(updated.rows[0]);
    }

    // Yangi mijoz yaratamiz
    const fakeTelegramId = "manual_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    const info = await query(
      "INSERT INTO customers (\"telegramId\", \"fullName\", phone, address, latitude, longitude) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [fakeTelegramId, fullName || null, phoneStr, address || null, latitude || null, longitude || null]
    );
    res.json(info.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Telefon raqam bo'yicha qidirish (Admin uchun)
router.get("/phone/:phone", async (req, res) => {
  try {
    let phoneStr = String(req.params.phone);
    if (!phoneStr.startsWith("+")) {
      phoneStr = "+" + phoneStr.replace(/\D/g, "");
    }
    const existing = await query("SELECT * FROM customers WHERE phone = $1", [phoneStr]);
    if (existing.rows.length > 0) {
      return res.json(existing.rows[0]);
    }
    res.status(404).json({ error: "Topilmadi" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Telegram bot: telefon raqam yuborilganda
router.post("/:telegramId/phone", async (req, res) => {
  try {
    const { telegramId } = req.params;
    const { phone } = req.body;
    const existing = await query("SELECT * FROM customers WHERE \"telegramId\" = $1", [String(telegramId)]);
    if (!existing.rows.length) return res.status(404).json({ error: "Mijoz topilmadi" });

    let phoneStr = String(phone);
    if (!phoneStr.startsWith("+")) {
      phoneStr = "+" + phoneStr.replace(/\D/g, "");
    }

    const oldCustomerRes = await query("SELECT * FROM customers WHERE phone = $1 AND id != $2", [phoneStr, existing.rows[0].id]);
    
    if (oldCustomerRes.rows.length > 0) {
      const oldCustomer = oldCustomerRes.rows[0];
      const newCustomer = existing.rows[0];

      // Eskisini (masalan admin qo'shgan) saqlab qolamiz va unga haqiqiy telegramId ni beramiz
      // Yangi ochilgan probelni o'chiramiz (chunki u faqat /start bosilganda ochilgan bo'sh profil)
      await query("DELETE FROM customers WHERE id = $1", [newCustomer.id]);
      await query("UPDATE customers SET \"telegramId\" = $1 WHERE id = $2", [telegramId, oldCustomer.id]);

      // Agar yangi profilida ism bo'lsa va eskida bo'lmasa uni ham olib qo'yamiz
      if (newCustomer.fullName && !oldCustomer.fullName) {
        await query("UPDATE customers SET \"fullName\" = $1 WHERE id = $2", [newCustomer.fullName, oldCustomer.id]);
      }

      const mergedCustomer = await query("SELECT * FROM customers WHERE id = $1", [oldCustomer.id]);
      return res.json(mergedCustomer.rows[0]);
    }

    await query("UPDATE customers SET phone = $1 WHERE id = $2", [phoneStr, existing.rows[0].id]);
    const updated = await query("SELECT * FROM customers WHERE id = $1", [existing.rows[0].id]);
    res.json(updated.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Telegram bot: til tanlanganda
router.post("/:telegramId/language", async (req, res) => {
  try {
    const { telegramId } = req.params;
    const { language } = req.body;
    const existing = await query("SELECT * FROM customers WHERE \"telegramId\" = $1", [String(telegramId)]);
    if (!existing.rows.length) return res.status(404).json({ error: "Mijoz topilmadi" });

    await query("UPDATE customers SET language = $1 WHERE id = $2", [language, existing.rows[0].id]);
    const updated = await query("SELECT * FROM customers WHERE id = $1", [existing.rows[0].id]);
    res.json(updated.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Telegram bot: lokatsiya yuborilganda
router.post("/:telegramId/location", async (req, res) => {
  try {
    const { telegramId } = req.params;
    const { latitude, longitude } = req.body;
    const existing = await query("SELECT * FROM customers WHERE \"telegramId\" = $1", [String(telegramId)]);
    if (!existing.rows.length) return res.status(404).json({ error: "Mijoz topilmadi" });

    await query("UPDATE customers SET latitude = $1, longitude = $2 WHERE id = $3", [latitude, longitude, existing.rows[0].id]);
    const updated = await query("SELECT * FROM customers WHERE id = $1", [existing.rows[0].id]);
    res.json(updated.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Telegram bot: "Idish qarzim" tugmasi bosilganda
router.get("/:telegramId", async (req, res) => {
  try {
    const { telegramId } = req.params;
    const result = await query("SELECT * FROM customers WHERE \"telegramId\" = $1", [String(telegramId)]);
    if (!result.rows.length) return res.status(404).json({ error: "Mijoz topilmadi" });
    res.json(result.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Admin panel: barcha mijozlar ro'yxati (qarzdorlik bo'yicha saralangan)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const result = await query("SELECT * FROM customers ORDER BY \"bottlesOwed\" DESC");
    res.json(result.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server xatosi" });
  }
});

module.exports = router;
