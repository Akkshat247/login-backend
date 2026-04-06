const mysql = require('mysql2');
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: "login-db-new1.c7oqmwqi0kq2.ca-central-1.rds.amazonaws.com",
  user: "admin",
  password: "test1234567",
  database: "loginapp"
});

db.connect(err => {
  if (err) {
    console.error("DB connection failed:", err);
    return;
  }

  console.log("Connected to RDS");

  db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50),
      password VARCHAR(50)
    )
  `);

  db.query(`
    INSERT INTO users (username, password)
    SELECT * FROM (SELECT 'admin', 'test1234567') AS tmp
    WHERE NOT EXISTS (
      SELECT username FROM users WHERE username='admin'
    ) LIMIT 1;
  `);
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.json({ success: false });
  }

  db.query(
    "SELECT * FROM users WHERE username=? AND password=?",
    [username, password],
    (err, results) => {
      if (err) {
        console.error(err);
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

app.listen(3000, () => console.log("Server running on port 3000"));