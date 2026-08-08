const { Pool } = require("pg");
require("dotenv").config();

const defaultDbUrl = "postgresql://neondb_owner:npg_6fF7SLygGoHt@ep-nameless-bread-ayi58quk-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require";
const dbUrl = process.env.DATABASE_URL || defaultDbUrl;

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

pool.on('error', (err, client) => {
  console.error('Bazada kutilmagan xatolik (Neon connection drop):', err);
});

// Helper: tezkor query (pool ulanishlarini to'g'ridan-to'g'ri qayta ishlatadi)
async function query(text, params) {
  return await pool.query(text, params);
}

// Sxema yaratish (server ishga tushganda bir marta chaqiriladi)
async function initSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      "telegramId" TEXT UNIQUE NOT NULL,
      "fullName" TEXT,
      phone TEXT,
      address TEXT,
      latitude REAL,
      longitude REAL,
      "bottlesOwed" INTEGER NOT NULL DEFAULT 0,
      language TEXT DEFAULT 'uz',
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      "volumeLiters" REAL NOT NULL DEFAULT 18.9,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS couriers (
      id SERIAL PRIMARY KEY,
      "telegramId" TEXT UNIQUE NOT NULL,
      "fullName" TEXT NOT NULL,
      phone TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      "bottlesWithCourier" INTEGER NOT NULL DEFAULT 0,
      "lastLat" REAL,
      "lastLng" REAL,
      "lastLocationUpdate" TEXT,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS bot_admins (
      id SERIAL PRIMARY KEY,
      "telegramId" TEXT UNIQUE NOT NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      "passwordHash" TEXT NOT NULL,
      "fullName" TEXT,
      role TEXT NOT NULL DEFAULT 'operator',
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- Mavjud jadvallarga yangi ustunlarni qo'shish (xavfsiz migratsiya)
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS address TEXT;


    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      "customerId" INTEGER NOT NULL REFERENCES customers(id),
      "courierId" INTEGER REFERENCES couriers(id),
      status TEXT NOT NULL DEFAULT 'new',
      "totalPrice" INTEGER NOT NULL DEFAULT 0,
      "bottlesGiven" INTEGER NOT NULL DEFAULT 0,
      "bottlesReturned" INTEGER NOT NULL DEFAULT 0,
      "deliveryLat" REAL,
      "deliveryLng" REAL,
      address TEXT,
      note TEXT,
      "paymentType" TEXT DEFAULT 'naqd',
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
      "reminder_sent" INTEGER NOT NULL DEFAULT 0
    );
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS "reminder_sent" INTEGER NOT NULL DEFAULT 0;

    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      "orderId" INTEGER NOT NULL REFERENCES orders(id),
      "productId" INTEGER NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL,
      price INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS warehouse (
      id SERIAL PRIMARY KEY,
      "fullBottles" INTEGER NOT NULL DEFAULT 0,
      "emptyBottles" INTEGER NOT NULL DEFAULT 0,
      "totalReceived" INTEGER NOT NULL DEFAULT 0
    );
  `);
  console.log("✅ PostgreSQL sxema tayyor.");
}

module.exports = { query, initSchema, pool };
