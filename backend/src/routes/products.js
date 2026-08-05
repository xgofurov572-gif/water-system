const express = require("express");
const { query } = require("../db");
const { authMiddleware, requireAdmin } = require("../auth");

const router = express.Router();

// Ochiq (public) — Telegram bot katalogni ko'rsatish uchun ishlatadi
router.get("/", async (req, res) => {
  try {
    const result = await query("SELECT * FROM products WHERE active = 1 ORDER BY id ASC");
    res.json(result.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Admin panel uchun — barcha mahsulotlar (nofaollari ham)
router.get("/all", authMiddleware, async (req, res) => {
  try {
    const result = await query("SELECT * FROM products ORDER BY id ASC");
    res.json(result.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Narxlarni faqat to'liq huquqli Admin qo'sha/o'zgartira oladi
router.post("/", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { name, price, volumeLiters } = req.body;
    if (!name || !price) return res.status(400).json({ error: "name va price majburiy" });

    const result = await query(
      "INSERT INTO products (name, price, \"volumeLiters\") VALUES ($1, $2, $3) RETURNING *",
      [name, Number(price), volumeLiters ? Number(volumeLiters) : 18.9]
    );
    res.json(result.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server xatosi" });
  }
});

router.patch("/:id", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await query("SELECT * FROM products WHERE id = $1", [id]);
    if (!existing.rows.length) return res.status(404).json({ error: "Mahsulot topilmadi" });

    const ex = existing.rows[0];
    const { name, price, volumeLiters, active } = req.body;
    const result = await query(
      "UPDATE products SET name = $1, price = $2, \"volumeLiters\" = $3, active = $4 WHERE id = $5 RETURNING *",
      [
        name !== undefined ? name : ex.name,
        price !== undefined ? Number(price) : ex.price,
        volumeLiters !== undefined ? Number(volumeLiters) : ex.volumeLiters,
        active !== undefined ? (active ? 1 : 0) : ex.active,
        id
      ]
    );
    res.json(result.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server xatosi" });
  }
});

module.exports = router;
