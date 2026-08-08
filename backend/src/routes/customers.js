const express = require("express");
const { query } = require("../db");
const { authMiddleware } = require("../auth");

const router = express.Router();

// Telegram bot: mijoz birinchi marta /start bosganda chaqiradi
router.post("/register", async (req, res) => {
  try {
    const { telegramId, fullName } = req.body;
    if (!telegramId) return res.status(400).json({ error: "telegramId majburiy" });

    const existing = await query("SELECT * FROM customers WHERE \"telegramId\" = $1", [String(telegramId)]);
    if (existing.rows.length > 0) {
      if (fullName) {
        await query("UPDATE customers SET \"fullName\" = $1 WHERE id = $2", [fullName, existing.rows[0].id]);
      }
      const updated = await query("SELECT * FROM customers WHERE id = $1", [existing.rows[0].id]);
      return res.json(updated.rows[0]);
    }

    const info = await query(
      "INSERT INTO customers (\"telegramId\", \"fullName\") VALUES ($1, $2) RETURNING *",
      [String(telegramId), fullName || null]
    );
    res.json(info.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Admin bot orqali qo'lda mijoz qo'shish
router.post("/manual", async (req, res) => {
  try {
    const { fullName, phone, address } = req.body;
    if (!phone) return res.status(400).json({ error: "Telefon raqam majburiy" });

    // Tekshiramiz, balki bu raqam allaqachon bazada bordir
    let phoneStr = String(phone);
    if (!phoneStr.startsWith("+")) {
      phoneStr = "+" + phoneStr.replace(/\D/g, "");
    }
    const existing = await query("SELECT * FROM customers WHERE phone = $1", [phoneStr]);
    if (existing.rows.length > 0) {
      // Agar manzil yangi kiritilgan bo'lsa yangilaymiz
      if (address) {
        await query("UPDATE customers SET address = $1, \"fullName\" = $2 WHERE id = $3", [address, fullName || existing.rows[0].fullName, existing.rows[0].id]);
      }
      const updated = await query("SELECT * FROM customers WHERE id = $1", [existing.rows[0].id]);
      return res.json(updated.rows[0]);
    }

    // Yangi mijoz yaratamiz
    const fakeTelegramId = "manual_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    const info = await query(
      "INSERT INTO customers (\"telegramId\", \"fullName\", phone, address) VALUES ($1, $2, $3, $4) RETURNING *",
      [fakeTelegramId, fullName || null, phoneStr, address || null]
    );
    res.json(info.rows[0]);
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

    await query("UPDATE customers SET phone = $1 WHERE id = $2", [phone, existing.rows[0].id]);
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
