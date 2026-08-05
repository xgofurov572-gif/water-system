const express = require("express");
const bcrypt = require("bcryptjs");
const { query } = require("../db");
const { signToken } = require("../auth");

const router = express.Router();

// Admin panelga kirish
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Login va parolni kiriting" });
    }

    const result = await query("SELECT * FROM admin_users WHERE username = $1", [username]);
    if (!result.rows.length) return res.status(401).json({ error: "Login yoki parol xato" });

    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Login yoki parol xato" });

    const token = signToken(user);
    res.json({ token, username: user.username, role: user.role, fullName: user.fullName });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server xatosi" });
  }
});

module.exports = router;
