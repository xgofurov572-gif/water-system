const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    SECRET,
    { expiresIn: "12h" }
  );
}

// Web panel so'rovlarini himoya qiluvchi middleware
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "Token yo'q" });
  const token = header.split(" ")[1];
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: "Token yaroqsiz yoki muddati tugagan" });
  }
}

// Faqat to'liq huquqli Admin uchun cheklov (narx, hisobot, foydalanuvchi boshqaruvi)
function requireAdmin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Bu amal faqat Admin uchun ruxsat etilgan" });
  }
  next();
}

module.exports = { signToken, authMiddleware, requireAdmin, SECRET };
