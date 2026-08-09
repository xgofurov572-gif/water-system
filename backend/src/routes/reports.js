const express = require("express");
const router = express.Router();
const { query } = require("../db");
const xl = require("excel4node");

router.get("/excel", async (req, res) => {
  try {
    const { period } = req.query; // 'week', 'month', 'year'

    let periodSql = "INTERVAL '7 days'";
    let periodName = "1 Haftalik";
    if (period === "month") {
      periodSql = "INTERVAL '1 month'";
      periodName = "1 Oylik";
    } else if (period === "year") {
      periodSql = "INTERVAL '1 year'";
      periodName = "1 Yillik";
    }

    // Har bir mijoz va ularning oxirgi belgilangan muddatdagi buyurtmalari (suvlar soni va summa) ni hisoblaymiz
    const sql = `
      SELECT 
        c."fullName",
        c.phone,
        c.address,
        c."bottlesOwed",
        c."customerType",
        c."companyName",
        c.inn,
        COALESCE(SUM(o."bottlesGiven"), 0) AS total_bottles,
        COALESCE(SUM(o."totalPrice"), 0) AS total_spent
      FROM customers c
      LEFT JOIN orders o ON o."customerId" = c.id AND o.status = 'done' AND o."updatedAt" >= NOW() - ${periodSql}
      GROUP BY c.id
      ORDER BY total_bottles DESC
    `;
    const result = await query(sql);
    const data = result.rows;

    const wb = new xl.Workbook();
    const ws = wb.addWorksheet('Mijozlar Hisoboti');

    const headerStyle = wb.createStyle({
      font: { bold: true, color: '#FFFFFF' },
      fill: { type: 'pattern', patternType: 'solid', fgColor: '#007BFF' },
      alignment: { horizontal: 'center' }
    });

    const headers = ["Turi", "Tashkilot nomi", "STIR (INN)", "Ismi", "Telefon raqami", "Manzil", "Qarz idishlar (ta)", `Sotib olingan idishlar (${periodName})`, `Jami summa (${periodName})`];
    headers.forEach((h, i) => {
      ws.cell(1, i + 1).string(h).style(headerStyle);
    });

    ws.column(1).setWidth(15);
    ws.column(2).setWidth(25);
    ws.column(3).setWidth(15);
    ws.column(4).setWidth(25);
    ws.column(5).setWidth(20);
    ws.column(6).setWidth(40);
    ws.column(7).setWidth(20);
    ws.column(8).setWidth(35);
    ws.column(9).setWidth(25);

    let rowIndex = 2;
    for (const row of data) {
      ws.cell(rowIndex, 1).string(row.customerType === 'yuridik' ? 'Yuridik' : 'Jismoniy');
      ws.cell(rowIndex, 2).string(row.companyName || "—");
      ws.cell(rowIndex, 3).string(row.inn || "—");
      ws.cell(rowIndex, 4).string(row.fullName || "Noma'lum");
      ws.cell(rowIndex, 5).string(row.phone || "—");
      ws.cell(rowIndex, 6).string(row.address || "Karta orqali");
      ws.cell(rowIndex, 7).number(Number(row.bottlesOwed));
      ws.cell(rowIndex, 8).number(Number(row.total_bottles));
      ws.cell(rowIndex, 9).number(Number(row.total_spent));
      rowIndex++;
    }

    // Faylni vaqtinchalik bufferga yozib, keyin yuboramiz
    wb.writeToBuffer().then((buffer) => {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=Mijozlar_${periodName}_Hisoboti.xlsx`);
      res.send(buffer);
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server xatosi" });
  }
});

module.exports = router;
