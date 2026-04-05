const mysql = require('mysql2');
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

/* 🔌 RDS CONNECTION */
const db = mysql.createConnection({
  host: "login-db-new1.c7oqmwqi0kq2.ca-central-1.rds.amazonaws.com",
  user: "admin",
  password: "test1234567",   // DB password
  database: "loginapp"
});

/* CONNECT + INIT */
db.connect(err => {
  if (err) {
    console.error("❌ DB connection failed:", err);
    return;
  }

  console.log("✅ Connected to RDS");

  /* 🗄️ CREATE TABLE */
  db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50),
      password VARCHAR(50)
    )
  `, (err) => {
    if (err) console.error("Table error:", err);
    else console.log("✅ Table ready");
  });

  /* ➕ INSERT DEFAULT USER */
  db.query(`
    INSERT INTO users (username, password)
    SELECT * FROM (SELECT 'admin', '123') AS tmp
    WHERE NOT EXISTS (
      SELECT username FROM users WHERE username='admin'
    ) LIMIT 1;
  `, (err) => {
    if (err) console.error("Insert error:", err);
    else console.log("✅ Default user ready");
  });
});

/* 🔐 LOGIN API */
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE username=? AND password=?",
    [username, password],
    (err, results) => {
      if (err) {
        console.error("Query error:", err);
        return res.status(500).json({ success: false });
      }

      if (results.length > 0) {
        return res.json({ success: true });
      } else {
        return res.json({ success: false });
      }
    }
  );
});

/* 🧪 TEST ROUTE */
app.get('/', (req, res) => {
  res.send("Backend running with RDS");
});

app.listen(3000, () => console.log("🚀 Server running on port 3000"));