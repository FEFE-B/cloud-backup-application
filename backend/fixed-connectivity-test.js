// Fixed connectivity test script for Cloud Backup Software
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Enable CORS
app.use(cors());

// Serve simple HTML for testing
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Backend Connectivity Test</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .card { border: 1px solid #ddd; border-radius: 4px; padding: 20px; margin-bottom: 20px; }
        button { padding: 10px 15px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #45a049; }
        pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; }
        .error { color: #ff0000; }
        .success { color: #008000; }
      </style>
    </head>
    <body>
      <h1>Backend Connectivity Test</h1>
      
      <div class="card">
        <h2>Test Simple Server (Port 5000)</h2>
        <button onclick="testConnection('http://localhost:5000/api/health')">Test Connection</button>
        <div id="result5000"></div>
      </div>
      
      <div class="card">
        <h2>Test Memory Server (Port 5001)</h2>
        <button onclick="testConnection('http://localhost:5001/api/health')">Test Connection</button>
        <div id="result5001"></div>
      </div>
      
      <div class="card">
        <h2>User Login Test</h2>
        <p>Test credentials: user@altaro.com / admin123</p>
        <button onclick="testLogin('http://localhost:5000/api/auth/login')">Test Login on Port 5000</button>
        <div id="resultLogin5000"></div>
      </div>

      <script>
        async function testConnection(url) {
          const resultId = url.includes('5000') ? 'result5000' : 'result5001';
          const resultElement = document.getElementById(resultId);
          
          resultElement.innerHTML = '<p>Testing connection...</p>';
          
          try {
            const startTime = new Date().getTime();
            const response = await fetch(url);
            const endTime = new Date().getTime();
            const data = await response.json();
            
            resultElement.innerHTML = 
              '<p class="success">✅ Connection successful! (' + (endTime - startTime) + 'ms)</p>' +
              '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
          } catch (error) {
            resultElement.innerHTML = 
              '<p class="error">❌ Connection failed!</p>' +
              '<pre class="error">' + error.message + '</pre>';
          }
        }
        
        async function testLogin(url) {
          const resultElement = document.getElementById('resultLogin5000');
          
          resultElement.innerHTML = '<p>Testing login...</p>';
          
          try {
            const startTime = new Date().getTime();
            const response = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: 'user@altaro.com',
                password: 'admin123'
              })
            });
            const endTime = new Date().getTime();
            const data = await response.json();
            
            resultElement.innerHTML = 
              '<p class="success">✅ Login successful! (' + (endTime - startTime) + 'ms)</p>' +
              '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
          } catch (error) {
            resultElement.innerHTML = 
              '<p class="error">❌ Login failed!</p>' +
              '<pre class="error">' + error.message + '</pre>';
          }
        }
      </script>
    </body>
    </html>
  `);
});

const PORT = 3456;
app.listen(PORT, () => {
  console.log(`Connectivity test server running at http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop');
});
