const express = require("express");
const { query } = require("../db");
const { authMiddleware } = require("../auth");

const router = express.Router();

function startOfPeriod(period) {
  const now = new Date();
  if (period === "week") {
    const day = now.getUTCDay() || 7;
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() - day + 1);
    monday.setUTCHours(0, 0, 0, 0);
    return monday.toISOString();
  }
  if (period === "month") {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  }
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

// Kunlik / haftalik / oylik savdo hajmi
router.get("/sales", authMiddleware, async (req, res) => {
  try {
    const period = req.query.period || "day";
    const since = startOfPeriod(period);
    const row = await query(
      `SELECT COUNT(*) as "ordersCount", COALESCE(SUM("totalPrice"),0) as "totalRevenue"
       FROM orders WHERE status = 'done' AND "updatedAt" >= $1`,
      [since]
    );
    const r = row.rows[0];
    res.json({ period, since, ordersCount: Number(r.ordersCount), totalRevenue: Number(r.totalRevenue) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Eng ko'p buyurtma bergan mijozlar reytingi (top 10)
router.get("/top-customers", authMiddleware, async (req, res) => {
  try {
    const result = await query(
      `SELECT c.id as "customerId", c."fullName", c.phone,
              COUNT(o.id) as "ordersCount", COALESCE(SUM(o."totalPrice"),0) as "totalSpent"
       FROM orders o JOIN customers c ON c.id = o."customerId"
       WHERE o.status = 'done'
       GROUP BY c.id, c."fullName", c.phone
       ORDER BY "ordersCount" DESC
       LIMIT 10`
    );
    res.json(result.rows.map((r) => ({ ...r, fullName: r.fullName || "Noma'lum" })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Kuryerlar samaradorligi
router.get("/couriers-performance", authMiddleware, async (req, res) => {
  try {
    const couriersRes = await query("SELECT * FROM couriers");
    const couriers = couriersRes.rows;
    const result = [];
    for (const courier of couriers) {
      const ordersRes = await query(
        "SELECT * FROM orders WHERE \"courierId\" = $1 AND status = 'done'",
        [courier.id]
      );
      const orders = ordersRes.rows;
      const durations = orders.map((o) => (new Date(o.updatedAt) - new Date(o.createdAt)) / 60000);
      const avgMinutes = durations.length
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;
      result.push({
        courierId: courier.id,
        fullName: courier.fullName,
        completedOrders: orders.length,
        avgDeliveryMinutes: avgMinutes,
        bottlesWithCourier: courier.bottlesWithCourier,
      });
    }
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Idish aylanmasi bo'yicha umumiy hisobot
router.get("/bottles", authMiddleware, async (req, res) => {
  try {
    let whRes = await query("SELECT * FROM warehouse LIMIT 1");
    if (!whRes.rows.length) {
      whRes = await query("INSERT INTO warehouse (\"fullBottles\", \"emptyBottles\") VALUES (0,0) RETURNING *");
    }
    const wh = whRes.rows[0];
    const withCustomers = await query("SELECT COALESCE(SUM(\"bottlesOwed\"),0) as total FROM customers");
    const withCouriers = await query("SELECT COALESCE(SUM(\"bottlesWithCourier\"),0) as total FROM couriers");
    res.json({
      warehouseFull: wh.fullBottles,
      warehouseEmpty: wh.emptyBottles,
      withCustomers: Number(withCustomers.rows[0].total),
      withCouriers: Number(withCouriers.rows[0].total),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server xatosi" });
  }
});

module.exports = router;
