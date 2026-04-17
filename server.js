const mysql = require("mysql2");
const express = require("express");
const cors = require("cors");

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

/* CONNECT DATABASE */
db.connect((err) => {
  if (err) {
    console.error("DB connection failed:", err);
  } else {
    console.log("Connected to RDS");
  }
});

/* CREATE TABLE */
db.query(`
  CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50),
    password VARCHAR(50)
  )
`);

/* INSERT DEFAULT USER */
db.query(`
  INSERT INTO users (username, password)
  SELECT * FROM (SELECT 'admin', 'test1234567') AS tmp
  WHERE NOT EXISTS (
    SELECT username FROM users WHERE username='admin'
  ) LIMIT 1
`);

/* LOGIN API */
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE username=? AND password=?",
    [username.trim(), password.trim()],
    (err, results) => {
      if (err) {
        console.error("Login query error:", err);
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

/* TEST ROUTE */
app.get("/", (req, res) => {
  res.send("Backend running with RDS");
});

/* DEBUG ROUTE */
app.get("/debug", (req, res) => {
  db.query("SELECT * FROM users", (err, results) => {
    if (err) {
      return res.json(err);
    }
    res.json(results);
  });
});

/* START SERVER */
app.listen(3000, "0.0.0.0", () => {
  console.log("Server running on port 3000");
});