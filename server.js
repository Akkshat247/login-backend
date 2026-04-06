require("dotenv").config();

const mysql   = require("mysql2");
const express = require("express");
const cors    = require("cors");
const helmet  = require("helmet");
const rateLimit = require("express-rate-limit");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:3001", "http://localhost:3000"];   // dev fallback

app.use(
  cors({
    origin: (origin, cb) => {
      // allow server-to-server calls (no origin) & listed origins
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error("Not allowed by CORS"));
    },
    methods: ["POST", "GET", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json());

// ── Rate limiter on /login (max 10 attempts per minute per IP) ────────────────
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many login attempts. Please wait a minute." },
});

// ── DB connection pool (handles reconnects automatically) ─────────────────────
const pool = mysql.createPool({
  host:               process.env.DB_HOST     || "login-db-new1.c7oqmwqi0kq2.ca-central-1.rds.amazonaws.com",
  user:               process.env.DB_USER     || "admin",
  password:           process.env.DB_PASSWORD || "test1234567",
  database:           process.env.DB_NAME     || "loginapp",
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
});

const db = pool.promise();

// ── Bootstrap DB table + seed admin user ─────────────────────────────────────
async function initDB() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id       INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50)  NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL
      )
    `);

    await db.query(`
      INSERT INTO users (username, password)
      SELECT 'admin', 'test1234567'
      WHERE NOT EXISTS (
        SELECT 1 FROM users WHERE username = 'admin'
      )
    `);

    console.log("✅  Database ready");
  } catch (err) {
    console.error("❌  DB init failed:", err.message);
    process.exit(1);   // don't start the server if the DB is broken
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

// Health check — used by Docker HEALTHCHECK and load balancers
app.get("/health", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: "error", message: "DB unavailable" });
  }
});

// Login
app.post("/login", loginLimiter, async (req, res) => {
  const { username, password } = req.body ?? {};

  // Basic validation
  if (!username?.trim() || !password?.trim()) {
    return res.status(400).json({ success: false, message: "Username and password are required." });
  }

  try {
    const [rows] = await db.query(
      "SELECT id FROM users WHERE username = ? AND password = ? LIMIT 1",
      [username.trim(), password.trim()]
    );

    if (rows.length > 0) {
      return res.json({ success: true, message: "Login successful." });
    }

    return res.status(401).json({ success: false, message: "Invalid username or password." });
  } catch (err) {
    console.error("Login query error:", err.message);
    return res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

// 404 catch-all
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

// ── Start ─────────────────────────────────────────────────────────────────────
initDB().then(() => {
  const server = app.listen(PORT, () =>
    console.log(`🚀  Server running on port ${PORT}`)
  );

  // Graceful shutdown
  const shutdown = () => {
    console.log("Shutting down…");
    server.close(() => {
      pool.end();
      process.exit(0);
    });
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT",  shutdown);
});