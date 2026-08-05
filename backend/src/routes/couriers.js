const express = require("express");
const { query } = require("../db");
const { authMiddleware, requireAdmin } = require("../auth");

const router = express.Router();

// Admin panel: kuryerlar ro'yxati
router.get("/", authMiddleware, async (req, res) => {
  try {
    const result = await query("SELECT * FROM couriers ORDER BY id ASC");
    res.json(result.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Admin panel: kuryerlar xaritasi uchun faol lokatsiyalar
router.get("/locations", authMiddleware, async (req, res) => {
  try {
    const result = await query(
      "SELECT id, \"fullName\", phone, \"lastLat\", \"lastLng\", \"lastLocationUpdate\" FROM couriers WHERE active = 1 AND \"lastLat\" IS NOT NULL"
    );
    res.json(result.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Admin panel: yangi kuryer qo'shish (faqat Admin)
router.post("/", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { telegramId, fullName, phone } = req.body;
    if (!telegramId || !fullName) {
      return res.status(400).json({ error: "telegramId va fullName majburiy" });
    }
    const result = await query(
      "INSERT INTO couriers (\"telegramId\", \"fullName\", phone) VALUES ($1, $2, $3) RETURNING *",
      [String(telegramId), fullName, phone || null]
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
    const existing = await query("SELECT * FROM couriers WHERE id = $1", [id]);
    if (!existing.rows.length) return res.status(404).json({ error: "Kuryer topilmadi" });

    const ex = existing.rows[0];
    const { fullName, phone, active, bottlesWithCourier } = req.body;
    const result = await query(
      "UPDATE couriers SET \"fullName\" = $1, phone = $2, active = $3, \"bottlesWithCourier\" = $4 WHERE id = $5 RETURNING *",
      [
        fullName !== undefined ? fullName : ex.fullName,
        phone !== undefined ? phone : ex.phone,
        active !== undefined ? (active ? 1 : 0) : ex.active,
        bottlesWithCourier !== undefined ? Number(bottlesWithCourier) : ex.bottlesWithCourier,
        id
      ]
    );
    res.json(result.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Kuryerdagi bo'sh idishlarni omborga qaytarish
router.post("/:id/return-empties", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { count } = req.body;
    const n = Number(count);
    if (!n || n <= 0) return res.status(400).json({ error: "count musbat son bo'lishi kerak" });

    const courierRes = await query("SELECT * FROM couriers WHERE id = $1", [id]);
    if (!courierRes.rows.length) return res.status(404).json({ error: "Kuryer topilmadi" });
    const courier = courierRes.rows[0];
    if (courier.bottlesWithCourier < n) {
      return res.status(400).json({ error: "Kuryerda shuncha bo'sh idish yo'q" });
    }

    await query("UPDATE couriers SET \"bottlesWithCourier\" = \"bottlesWithCourier\" - $1 WHERE id = $2", [n, id]);

    let wh = await query("SELECT * FROM warehouse LIMIT 1");
    if (!wh.rows.length) {
      wh = await query("INSERT INTO warehouse (\"fullBottles\", \"emptyBottles\") VALUES (0,0) RETURNING *");
    }
    await query("UPDATE warehouse SET \"emptyBottles\" = \"emptyBottles\" + $1 WHERE id = $2", [n, wh.rows[0].id]);

    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Courier bot: jonli lokatsiya yangilash (ochiq API, botdan keladi)
router.post("/:telegramId/location", async (req, res) => {
  try {
    const { telegramId } = req.params;
    const { lat, lng } = req.body;
    if (!lat || !lng) return res.status(400).json({ error: "lat va lng kerak" });

    const courierRes = await query("SELECT id FROM couriers WHERE \"telegramId\" = $1", [String(telegramId)]);
    if (!courierRes.rows.length) return res.status(404).json({ error: "Kuryer topilmadi" });

    await query(
      "UPDATE couriers SET \"lastLat\" = $1, \"lastLng\" = $2, \"lastLocationUpdate\" = NOW() WHERE \"telegramId\" = $3",
      [lat, lng, String(telegramId)]
    );
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Courier bot: smena ochish/yopish
router.post("/:telegramId/duty", async (req, res) => {
  try {
    const { telegramId } = req.params;
    const { onDuty } = req.body;
    const courierRes = await query("SELECT * FROM couriers WHERE \"telegramId\" = $1", [String(telegramId)]);
    if (!courierRes.rows.length) return res.status(404).json({ error: "Kuryer topilmadi" });

    if (onDuty) {
      await query("UPDATE couriers SET active = 1 WHERE \"telegramId\" = $1", [String(telegramId)]);
    } else {
      await query("UPDATE couriers SET active = 0, \"lastLat\" = NULL, \"lastLng\" = NULL WHERE \"telegramId\" = $1", [String(telegramId)]);
    }
    const updated = await query("SELECT * FROM couriers WHERE \"telegramId\" = $1", [String(telegramId)]);
    res.json(updated.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Courier bot: kuryer o'z profilini olishi
router.get("/:telegramId/me", async (req, res) => {
  try {
    const { telegramId } = req.params;
    const result = await query("SELECT * FROM couriers WHERE \"telegramId\" = $1", [String(telegramId)]);
    if (!result.rows.length) return res.status(404).json({ error: "Kuryer topilmadi" });
    res.json(result.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Courier bot: bugungi statistika
router.get("/:telegramId/stats", async (req, res) => {
  try {
    const { telegramId } = req.params;
    const courierRes = await query("SELECT * FROM couriers WHERE \"telegramId\" = $1", [String(telegramId)]);
    if (!courierRes.rows.length) return res.status(404).json({ error: "Kuryer topilmadi" });
    const courier = courierRes.rows[0];

    const today = new Date().toISOString().split("T")[0];
    const ordersRes = await query(
      `SELECT o.*, c."fullName" as "customerName"
       FROM orders o
       LEFT JOIN customers c ON c.id = o."customerId"
       WHERE o."courierId" = $1 AND o.status = 'done'
       AND DATE(o."updatedAt") = $2`,
      [courier.id, today]
    );
    const orders = ordersRes.rows;

    const totalRevenue = orders.reduce((s, o) => s + (o.totalPrice || 0), 0);
    const totalBottlesGiven = orders.reduce((s, o) => s + (o.bottlesGiven || 0), 0);
    const totalBottlesReturned = orders.reduce((s, o) => s + (o.bottlesReturned || 0), 0);

    res.json({
      ordersCount: orders.length,
      totalRevenue,
      totalBottlesGiven,
      totalBottlesReturned,
      bottlesWithCourier: courier.bottlesWithCourier,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server xatosi" });
  }
});

module.exports = router;
