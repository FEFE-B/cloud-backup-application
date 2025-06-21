const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('./'));

// API Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Altaro API running' });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'working-dashboard.html'));
});

app.listen(PORT, () => {
    console.log(` Altaro Server running on port ${PORT}`);
    console.log(` Dashboard: http://localhost:${PORT}/`);
});
