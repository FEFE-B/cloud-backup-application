// API Diagnostic Utility
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');
const axios = require('axios');

const app = express();

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Information route - provides server and environment details
app.get('/api/info', (req, res) => {
  const info = {
    serverInfo: {
      hostname: os.hostname(),
      platform: os.platform(),
      type: os.type(),
      arch: os.arch(),
      release: os.release(),
      uptime: os.uptime(),
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
      },
      cpu: os.cpus(),
      networkInterfaces: os.networkInterfaces()
    },
    timestamp: new Date().toISOString(),
    serverStatus: 'online'
  };
  
  res.json(info);
});

// Test database connectivity
app.get('/api/database-test', (req, res) => {
  // This is just a mock as we don't have actual DB credentials
  res.json({
    status: 'ok',
    message: 'Mock database connection test successful',
    timestamp: new Date().toISOString()
  });
});

// Test backend connectivity
app.get('/api/backend-test', async (req, res) => {
  try {
    const backendResponse = await axios.get('http://localhost:5000/api/health', { timeout: 5000 });
    res.json({
      status: 'ok',
      message: 'Backend connection successful',
      backendResponse: backendResponse.data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Backend connection failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test file system access
app.get('/api/filesystem-test', (req, res) => {
  try {
    // Check if we can read the current directory
    const files = fs.readdirSync(__dirname);
    
    // Try to create a test file
    const testFilePath = path.join(__dirname, 'test-file.txt');
    fs.writeFileSync(testFilePath, 'This is a test file created by the diagnostic tool.');
    
    // Read the test file
    const content = fs.readFileSync(testFilePath, 'utf8');
    
    // Delete the test file
    fs.unlinkSync(testFilePath);
    
    res.json({
      status: 'ok',
      message: 'File system access test successful',
      fileCount: files.length,
      testFileContent: content,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'File system access test failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get a list of running diagnostics services
app.get('/api/services', async (req, res) => {
  try {
    const services = [
      { name: 'Backend API', url: 'http://localhost:5000/api/health', status: 'unknown' },
      { name: 'Diagnostics Server', url: 'http://localhost:62376/diagnostics.html', status: 'unknown' },
      { name: 'API Diagnostics', url: 'http://localhost:3030/api/info', status: 'online' }
    ];
    
    // Check each service
    for (let i = 0; i < services.length; i++) {
      if (services[i].name === 'API Diagnostics') continue; // Skip self check
      
      try {
        await axios.get(services[i].url, { timeout: 3000 });
        services[i].status = 'online';
      } catch (error) {
        services[i].status = 'offline';
        services[i].error = error.message;
      }
    }
    
    res.json({
      services,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Service check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Start the server
const PORT = 3030;
app.listen(PORT, () => {
  console.log(`API Diagnostic server running at http://localhost:${PORT}/`);
  console.log(`Server information available at http://localhost:${PORT}/api/info`);
  console.log(`Service status check available at http://localhost:${PORT}/api/services`);
  console.log('Press Ctrl+C to stop');
});
