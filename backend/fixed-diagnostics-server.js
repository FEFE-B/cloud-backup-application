// Simple diagnostic server with explicit routes
const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();

// Enable CORS for all routes
app.use(cors());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../frontend/public')));

// Explicitly define route for /diagnostics
app.get('/diagnostics', (req, res) => {
  const diagnosticsPath = path.join(__dirname, '../frontend/public/diagnostics.html');
  
  if (fs.existsSync(diagnosticsPath)) {
    res.sendFile(diagnosticsPath);
  } else {
    res.status(404).send('Diagnostics file not found');
  }
});

// Add specific route for dashboard
app.get('/dashboard', (req, res) => {
  const dashboardPath = path.join(__dirname, '../frontend/public/dashboard.html');
  
  if (fs.existsSync(dashboardPath)) {
    res.sendFile(dashboardPath);
  } else {
    res.status(404).send('Dashboard file not found');
  }
});

// Add specific route for API dashboard
app.get('/api-dashboard', (req, res) => {
  const apiDashboardPath = path.join(__dirname, '../frontend/public/api-dashboard.html');
  
  if (fs.existsSync(apiDashboardPath)) {
    res.sendFile(apiDashboardPath);
  } else {
    res.status(404).send('API Dashboard file not found');
  }
});

// Add specific route for diagnostics portal
app.get('/diagnostics-portal', (req, res) => {
  const portalPath = path.join(__dirname, '../frontend/public/diagnostics-portal.html');
  
  if (fs.existsSync(portalPath)) {
    res.sendFile(portalPath);
  } else {
    res.status(404).send('Diagnostics Portal file not found');
  }
});

// Redirect root to diagnostics portal
app.get('/', (req, res) => {
  res.redirect('/diagnostics-portal');
});

// Add a "catchall" route for any missing pages
app.use((req, res) => {
  res.status(404).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Page Not Found</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; line-height: 1.6; }
        h1 { color: #e74c3c; }
        .links { margin-top: 30px; }
        a { color: #3498db; text-decoration: none; }
        a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <h1>Page Not Found</h1>
      <p>The page you are looking for doesn't exist or has been moved.</p>
        <div class="links">        <p><strong>Available pages:</strong></p>
        <ul>
          <li><a href="/diagnostics-portal">Diagnostics Portal</a></li>
          <li><a href="/dashboard">Dashboard</a></li>
          <li><a href="/api-dashboard">API Dashboard</a></li>
          <li><a href="/diagnostics.html">Basic Diagnostics</a></li>
          <li><a href="/diagnostics">Diagnostics (alternate link)</a></li>
          <li><a href="/comprehensive-diagnostics.html">Comprehensive Diagnostics</a></li>
          <li><a href="/simple-test.html">Simple Test</a></li>
        </ul>
      </div>
      
      <p><a href="/">&larr; Go to Home</a></p>
    </body>
    </html>
  `);
});

// Start the server
const PORT = 62376;
app.listen(PORT, () => {
  console.log(`Diagnostics server running at http://localhost:${PORT}/`);
  console.log(`Open http://localhost:${PORT}/diagnostics-portal for the main diagnostics portal`);
  console.log(`Open http://localhost:${PORT}/dashboard for the main dashboard`);
  console.log(`Open http://localhost:${PORT}/api-dashboard for the API dashboard`);
  console.log(`Open http://localhost:${PORT}/diagnostics.html for basic diagnostics`);
  console.log(`Open http://localhost:${PORT}/comprehensive-diagnostics.html for comprehensive diagnostics`);
  console.log('Press Ctrl+C to stop');
});
