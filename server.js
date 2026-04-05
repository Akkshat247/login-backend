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
  password: "test1234567",
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

  /* 🔥 FORCE CLEAN DATA (STEP 3 FIX) */
  db.query("DELETE FROM users", (err) => {
    if (err) console.error("Delete error:", err);
    else console.log("✅ Old data cleared");
  });

  db.query(`
    INSERT INTO users (username, password)
    VALUES ('admin', '123')
  `, (err) => {
    if (err) console.error("Insert error:", err);
    else console.log("✅ Fresh user inserted");
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

/* 🧪 DEBUG ROUTE (VERY USEFUL) */
app.get('/debug', (req, res) => {
  db.query("SELECT * FROM users", (err, results) => {
    if (err) return res.json({ error: err });
    res.json(results);
  });
});

/* 🧪 TEST ROUTE */
app.get('/', (req, res) => {
  res.send("Backend running with RDS");
});

app.listen(3000, () => console.log("🚀 Server running on port 3000"));