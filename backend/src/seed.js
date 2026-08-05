require("dotenv").config();
const bcrypt = require("bcryptjs");
const db = require("./db");

function upsertAdmin(username, password, fullName, role) {
  const existing = db.prepare("SELECT * FROM admin_users WHERE username = ?").get(username);
  const passwordHash = bcrypt.hashSync(password, 10);
  if (existing) {
    db.prepare("UPDATE admin_users SET passwordHash = ?, fullName = ?, role = ? WHERE id = ?").run(
      passwordHash,
      fullName,
      role,
      existing.id
    );
  } else {
    db.prepare(
      "INSERT INTO admin_users (username, passwordHash, fullName, role) VALUES (?, ?, ?, ?)"
    ).run(username, passwordHash, fullName, role);
  }
}

// Boshlang'ich Admin va Operator
upsertAdmin("admin", "admin123", "Bosh Admin", "admin");
upsertAdmin("operator", "operator123", "Operator", "operator");

// Namunaviy mahsulotlar
const productCount = db.prepare("SELECT COUNT(*) as c FROM products").get().c;
if (productCount === 0) {
  db.prepare("INSERT INTO products (name, price, volumeLiters) VALUES (?, ?, ?)").run(
    "Toza suv 18.9L (oddiy)",
    15000,
    18.9
  );
  db.prepare("INSERT INTO products (name, price, volumeLiters) VALUES (?, ?, ?)").run(
    "Toza suv 18.9L (mineral)",
    18000,
    18.9
  );
}

// Ombor boshlang'ich holati
const wh = db.prepare("SELECT * FROM warehouse LIMIT 1").get();
if (!wh) {
  db.prepare("INSERT INTO warehouse (fullBottles, emptyBottles) VALUES (200, 0)").run();
}

console.log("✅ Seed muvaffaqiyatli yakunlandi.");
console.log("   Admin login:    admin / admin123");
console.log("   Operator login: operator / operator123");
