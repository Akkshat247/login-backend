const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (username === "admin" && password === "123") {
        return res.json({ success: true });
    }

    res.json({ success: false });
});

app.get('/', (req, res) => {
    res.send("Backend running");
});

app.listen(3000, () => console.log("Server running on port 3000"));