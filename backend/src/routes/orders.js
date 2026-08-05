const express = require("express");
const { query } = require("../db");
const { authMiddleware } = require("../auth");

const router = express.Router();

async function getOrCreateWarehouse() {
  let wh = await query("SELECT * FROM warehouse LIMIT 1");
  if (!wh.rows.length) {
    wh = await query("INSERT INTO warehouse (\"fullBottles\", \"emptyBottles\") VALUES (0, 0) RETURNING *");
  }
  return wh.rows[0];
}

async function getOrderFull(id) {
  const orderRes = await query("SELECT * FROM orders WHERE id = $1", [id]);
  if (!orderRes.rows.length) return null;
  const order = orderRes.rows[0];

  const customerRes = await query("SELECT * FROM customers WHERE id = $1", [order.customerId]);
  const customer = customerRes.rows[0] || null;

  let courier = null;
  if (order.courierId) {
    const courierRes = await query("SELECT * FROM couriers WHERE id = $1", [order.courierId]);
    courier = courierRes.rows[0] || null;
  }

  const itemsRes = await query(
    `SELECT oi.*, p.name as "productName", p."volumeLiters"
     FROM order_items oi JOIN products p ON p.id = oi."productId"
     WHERE oi."orderId" = $1`,
    [order.id]
  );

  return { ...order, customer, courier, items: itemsRes.rows };
}

function getHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ---- Telegram (mijoz) bot: yangi buyurtma yaratish ----
router.post("/", async (req, res) => {
  try {
    const { telegramId, items, address, note, paymentType } = req.body;
    if (!telegramId || !items || !items.length) {
      return res.status(400).json({ error: "telegramId va items majburiy" });
    }

    const customerRes = await query("SELECT * FROM customers WHERE \"telegramId\" = $1", [String(telegramId)]);
    if (!customerRes.rows.length) return res.status(404).json({ error: "Mijoz ro'yxatdan o'tmagan. Avval /start bosing." });
    const customer = customerRes.rows[0];
    if (!customer.phone || customer.latitude == null) {
      return res.status(400).json({ error: "Avval telefon raqam va lokatsiyani yuboring" });
    }

    let totalPrice = 0;
    let totalBottles = 0;
    const resolvedItems = [];
    for (const i of items) {
      const productRes = await query("SELECT * FROM products WHERE id = $1", [i.productId]);
      if (!productRes.rows.length) return res.status(400).json({ error: "Mahsulot topilmadi: " + i.productId });
      const product = productRes.rows[0];
      totalPrice += product.price * i.quantity;
      totalBottles += i.quantity;
      resolvedItems.push({ productId: product.id, quantity: i.quantity, price: product.price });
    }

    const activeCouriersRes = await query("SELECT * FROM couriers WHERE active = 1");
    const activeCouriers = activeCouriersRes.rows;

    const maqsud = activeCouriers.find(c => c.fullName && c.fullName.toLowerCase().includes("maqsud"));
    const courierId = maqsud ? maqsud.id : (activeCouriers.length ? activeCouriers[0].id : null);
    const orderStatus = courierId ? "assigned" : "new";

    const orderRes = await query(
      `INSERT INTO orders ("customerId", "courierId", status, "totalPrice", address, note, "deliveryLat", "deliveryLng", "paymentType")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [customer.id, courierId, orderStatus, totalPrice, address || null, note || null, customer.latitude, customer.longitude, paymentType || "naqd"]
    );
    const orderId = orderRes.rows[0].id;

    for (const it of resolvedItems) {
      await query(
        "INSERT INTO order_items (\"orderId\", \"productId\", quantity, price) VALUES ($1, $2, $3, $4)",
        [orderId, it.productId, it.quantity, it.price]
      );
    }

    // Ombordan to'liq idishlarni rezerv qilish
    const wh = await getOrCreateWarehouse();
    await query("UPDATE warehouse SET \"fullBottles\" = \"fullBottles\" - $1 WHERE id = $2", [totalBottles, wh.id]);

    const fullOrder = await getOrderFull(orderId);
    const token = "8641929454:AAFXvYRmp8xpdFQyG-jZ3hObXzdr7TuqAnY";
    const notifyText = `🔔 <b>Yangi buyurtma kelib tushdi!</b>\nBuyurtma #${fullOrder.id}\nManzil: ${fullOrder.address || "Ko'rsatilmagan"}\nJami: ${fullOrder.totalPrice} so'm\n\nIltimos, bot menyusidagi 📋 <b>Buyurtmalar</b> bo'limiga kirib ko'ring.`;
    const https = require('https');
    
    // Debug array to capture notification results
    const notifyDebug = [];

    for (const c of activeCouriers) {
      if (!c.telegramId) continue;
      try {
        const postData = JSON.stringify({ chat_id: c.telegramId, text: notifyText, parse_mode: "HTML" });
        const options = {
          hostname: 'api.telegram.org',
          port: 443,
          path: `/bot${token}/sendMessage`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          }
        };
        
        // Wrap in a Promise to await the response
        await new Promise((resolve, reject) => {
          const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
              notifyDebug.push({ courier: c.fullName, status: res.statusCode, response: body });
              resolve();
            });
          });
          req.on('error', (e) => {
            notifyDebug.push({ courier: c.fullName, error: e.message });
            resolve(); // Resolve anyway so it doesn't crash the loop
          });
          req.write(postData);
          req.end();
        });
      } catch (err) {
        notifyDebug.push({ courier: c.fullName, catchError: err.message });
      }
    }

    // Attach debug info to response
    const responseBody = { ...fullOrder, notifyDebug };
    res.json(responseBody);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// ---- Admin panel: barcha buyurtmalar ----
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { status } = req.query;
    const rows = status
      ? await query("SELECT id FROM orders WHERE status = $1 ORDER BY \"createdAt\" DESC", [status])
      : await query("SELECT id FROM orders ORDER BY \"createdAt\" DESC");

    const orders = [];
    for (const r of rows.rows) {
      orders.push(await getOrderFull(r.id));
    }
    res.json(orders);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// ---- Admin panel: buyurtmani kuryerga biriktirish ----
router.patch("/:id/assign", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { courierId } = req.body;
    if (!courierId) return res.status(400).json({ error: "courierId majburiy" });

    const orderRes = await query("SELECT * FROM orders WHERE id = $1", [id]);
    if (!orderRes.rows.length) return res.status(404).json({ error: "Buyurtma topilmadi" });

    await query(
      "UPDATE orders SET \"courierId\" = $1, status = 'assigned', \"updatedAt\" = NOW() WHERE id = $2",
      [Number(courierId), id]
    );

    const fullOrder = await getOrderFull(id);

    const defaultCourierToken = "8641929454:AAFXvYRmp8xpdFQyG-jZ3hObXzdr7TuqAnY";
    const token = process.env.COURIER_BOT_TOKEN || defaultCourierToken;
    if (token && fullOrder.courier && fullOrder.courier.telegramId) {
      const text = `🔔 <b>Yangi buyurtma!</b>\nSizga yangi buyurtma biriktirildi: #${fullOrder.id}\n\nIltimos, bot menyusidagi 📋 <b>Buyurtmalar</b> bo'limiga kirib ko'ring.`;
      fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: fullOrder.courier.telegramId, text, parse_mode: "HTML" })
      }).catch(err => console.error("Kuryerga xabar yuborishda xatolik:", err));
    }

    res.json(fullOrder);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// ---- Admin panel/Kuryer bot: statusni o'zgartirish ----
router.patch("/:id/status", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const allowed = ["new", "assigned", "delivering", "done", "cancelled"];
    if (!allowed.includes(status)) return res.status(400).json({ error: "Noto'g'ri status" });

    const orderRes = await query("SELECT * FROM orders WHERE id = $1", [id]);
    if (!orderRes.rows.length) return res.status(404).json({ error: "Buyurtma topilmadi" });

    await query("UPDATE orders SET status = $1, \"updatedAt\" = NOW() WHERE id = $2", [status, id]);
    const fullOrder = await getOrderFull(id);

    if (status === "delivering" && fullOrder.customer && fullOrder.customer.telegramId) {
      const defaultCustomerToken = "8696687383:AAEDnnQZ06JXmBYrYUMZme6-5zbxarxTD04";
      const token = process.env.CUSTOMER_BOT_TOKEN || defaultCustomerToken;
      if (token) {
        const text = `🚚 <b>Buyurtmangiz yo'lga chiqdi!</b>\n\nKuryer siz tomonga kelyapti. Iltimos, kuting.`;
        fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: fullOrder.customer.telegramId, text, parse_mode: "HTML" })
        }).catch(err => console.error("Mijozga xabar yuborishda xatolik:", err));
      }
    }

    res.json(fullOrder);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// ---- Kuryer bot: o'ziga biriktirilgan buyurtmalar ----
router.get("/courier/:telegramId", async (req, res) => {
  try {
    const { telegramId } = req.params;
    const courierRes = await query("SELECT * FROM couriers WHERE \"telegramId\" = $1", [String(telegramId)]);
    if (!courierRes.rows.length) return res.status(404).json({ error: "Kuryer topilmadi" });
    const courier = courierRes.rows[0];

    const rows = await query(
      "SELECT id FROM orders WHERE (\"courierId\" = $1 OR \"courierId\" IS NULL) AND status IN ('new','assigned','delivering') ORDER BY \"createdAt\" ASC",
      [courier.id]
    );
    const orders = [];
    for (const r of rows.rows) {
      orders.push(await getOrderFull(r.id));
    }
    res.json(orders);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// ---- Kuryer bot: marshrut tuzish (Nearest Neighbor) ----
router.get("/courier/:telegramId/route", async (req, res) => {
  try {
    const { telegramId } = req.params;
    const courierRes = await query("SELECT * FROM couriers WHERE \"telegramId\" = $1", [String(telegramId)]);
    if (!courierRes.rows.length) return res.status(404).json({ error: "Kuryer topilmadi" });
    const courier = courierRes.rows[0];

    if (courier.lastLat == null || courier.lastLng == null) {
      return res.status(400).json({ error: "Kuryer lokatsiyasi aniqlanmagan" });
    }

    const rows = await query(
      "SELECT id FROM orders WHERE \"courierId\" = $1 AND status IN ('assigned','delivering')",
      [courier.id]
    );
    if (!rows.rows.length) return res.json([]);

    const ordersArr = [];
    for (const r of rows.rows) {
      ordersArr.push(await getOrderFull(r.id));
    }
    const orders = ordersArr.filter(o => o.deliveryLat != null && o.deliveryLng != null);

    let currentLat = courier.lastLat;
    let currentLng = courier.lastLng;
    const unvisited = [...orders];
    const route = [];

    while (unvisited.length > 0 && route.length < 10) {
      let nearestIndex = 0;
      let minDistance = Infinity;
      for (let i = 0; i < unvisited.length; i++) {
        const dist = getHaversineDistance(currentLat, currentLng, unvisited[i].deliveryLat, unvisited[i].deliveryLng);
        if (dist < minDistance) { minDistance = dist; nearestIndex = i; }
      }
      const nextOrder = unvisited.splice(nearestIndex, 1)[0];
      route.push(nextOrder);
      currentLat = nextOrder.deliveryLat;
      currentLng = nextOrder.deliveryLng;
    }

    res.json(route);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// ---- Mijoz bot: o'zining barcha buyurtmalarini olish ----
router.get("/customer/:telegramId", async (req, res) => {
  try {
    const { telegramId } = req.params;
    const customerRes = await query("SELECT * FROM customers WHERE \"telegramId\" = $1", [String(telegramId)]);
    if (!customerRes.rows.length) return res.status(404).json({ error: "Mijoz topilmadi" });
    const customer = customerRes.rows[0];

    const rows = await query(
      "SELECT id FROM orders WHERE \"customerId\" = $1 ORDER BY \"createdAt\" DESC LIMIT 20",
      [customer.id]
    );
    const orders = [];
    for (const r of rows.rows) {
      orders.push(await getOrderFull(r.id));
    }
    res.json(orders);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// ---- Bitta buyurtma (ID bo'yicha) ----
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const fullOrder = await getOrderFull(req.params.id);
    if (!fullOrder) return res.status(404).json({ error: "Buyurtma topilmadi" });
    res.json(fullOrder);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// ---- Kuryer bot: yetkazib berishni yakunlash ----
router.post("/:id/deliver", async (req, res) => {
  try {
    const { id } = req.params;
    const { bottlesGiven, bottlesReturned } = req.body;

    const orderRes = await query("SELECT * FROM orders WHERE id = $1", [id]);
    if (!orderRes.rows.length) return res.status(404).json({ error: "Buyurtma topilmadi" });
    const order = orderRes.rows[0];
    if (!order.courierId) return res.status(400).json({ error: "Buyurtma hech kimga biriktirilmagan" });

    const given = Number(bottlesGiven) || 0;
    const returned = Number(bottlesReturned) || 0;

    await query(
      "UPDATE orders SET status = 'done', \"bottlesGiven\" = $1, \"bottlesReturned\" = $2, \"updatedAt\" = NOW() WHERE id = $3",
      [given, returned, id]
    );
    await query("UPDATE customers SET \"bottlesOwed\" = \"bottlesOwed\" + $1 WHERE id = $2", [given - returned, order.customerId]);
    await query("UPDATE couriers SET \"bottlesWithCourier\" = \"bottlesWithCourier\" + $1 WHERE id = $2", [returned, order.courierId]);

    const fullOrder = await getOrderFull(id);
    res.json(fullOrder);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server xatosi" });
  }
});

module.exports = router;
