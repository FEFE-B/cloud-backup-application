// index.js
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3030;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  // Basic check (replace with real logic)
  if ((email === 'admin@altaro.com' || email === 'user@altaro.com') && password === 'admin123') {
    return res.status(200).json({ success: true, role: email.includes('admin') ? 'admin' : 'user' });
  }

  res.status(401).json({ success: false, message: 'Invalid credentials' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
