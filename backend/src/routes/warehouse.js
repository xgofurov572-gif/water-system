const express = require("express");
const { query } = require("../db");
const { authMiddleware, requireAdmin } = require("../auth");

const router = express.Router();

async function getOrCreateWarehouse() {
  let wh = await query("SELECT * FROM warehouse LIMIT 1");
  if (!wh.rows.length) {
    wh = await query("INSERT INTO warehouse (\"fullBottles\", \"emptyBottles\", \"totalReceived\") VALUES (0,0,0) RETURNING *");
  }
  return wh.rows[0];
}

// Admin panel: Ombordagi / Mijozlardagi / Kuryerdagi 18.9L idishlar balansi
router.get("/", authMiddleware, async (req, res) => {
  try {
    const wh = await getOrCreateWarehouse();
    const withCustomers = await query("SELECT COALESCE(SUM(\"bottlesOwed\"),0) as total FROM customers");
    const withCouriers = await query("SELECT COALESCE(SUM(\"bottlesWithCourier\"),0) as total FROM couriers");
    const totalDelivered = await query("SELECT COALESCE(SUM(\"bottlesGiven\"),0) as total FROM orders WHERE status = 'done'");

    res.json({
      warehouse: {
        fullBottles: wh.fullBottles,
        emptyBottles: wh.emptyBottles,
        totalReceived: wh.totalReceived || 0,
        totalDelivered: Number(totalDelivered.rows[0].total),
      },
      withCustomers: Number(withCustomers.rows[0].total),
      withCouriers: Number(withCouriers.rows[0].total),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Admin panel: ombordagi to'liq idishlar sonini to'ldirish
router.post("/restock", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { fullBottles } = req.body;
    const n = Number(fullBottles);
    if (!n) return res.status(400).json({ error: "fullBottles majburiy" });

    const wh = await getOrCreateWarehouse();
    const result = await query(
      "UPDATE warehouse SET \"fullBottles\" = \"fullBottles\" + $1, \"totalReceived\" = \"totalReceived\" + $2 WHERE id = $3 RETURNING *",
      [n, n, wh.id]
    );
    res.json(result.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server xatosi" });
  }
});

module.exports = router;
