// Simple diagnostics server
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();

// Enable CORS for all routes
app.use(cors());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../frontend/public')));

// Redirect root to diagnostics.html
app.get('/', (req, res) => {
  res.redirect('/diagnostics.html');
});

// Add specific route for /diagnostics to redirect to diagnostics.html
app.get('/diagnostics', (req, res) => {
  res.redirect('/diagnostics.html');
});

// Start the server
const PORT = 62376; // Use the same port that was having issues
app.listen(PORT, () => {
  console.log(`Diagnostics server running at http://localhost:${PORT}/`);
  console.log(`Open http://localhost:${PORT}/diagnostics.html for basic diagnostics`);
  console.log(`Open http://localhost:${PORT}/comprehensive-diagnostics.html for comprehensive diagnostics`);
  console.log('Press Ctrl+C to stop');
});
