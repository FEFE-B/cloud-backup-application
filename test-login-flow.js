#!/usr/bin/env node

/**
 * Comprehensive test script for login functionality
 * Tests server connectivity, authentication, and error handling
 */

const http = require('http');
const https = require('https');

// Test configuration
const tests = {
  mainServer: {
    host: 'localhost',
    port: 5000,
    path: '/api/health'
  },
  simpleServer: {
    host: 'localhost', 
    port: 3030,
    path: '/api/auth/status'
  },
  frontend: {
    host: 'localhost',
    port: 3000,
    path: '/'
  }
};

const credentials = {
  admin: {
    email: 'admin@altaro.com',
    password: 'admin123'
  },
  user: {
    email: 'user@altaro.com', 
    password: 'admin123'
  }
};

/**
 * Test server connectivity
 * @param {Object} config - Server configuration
 * @returns {Promise<boolean>} - Whether server is responsive
 */
function testServerConnection(config) {
  return new Promise((resolve) => {
    const options = {
      hostname: config.host,
      port: config.port,
      path: config.path,
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      console.log(`✅ ${config.host}:${config.port} - Status: ${res.statusCode}`);
      resolve(true);
    });

    req.on('error', (err) => {
      console.log(`❌ ${config.host}:${config.port} - Error: ${err.message}`);
      resolve(false);
    });

    req.on('timeout', () => {
      console.log(`⏰ ${config.host}:${config.port} - Timeout`);
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

/**
 * Test login endpoint
 * @param {Object} serverConfig - Server configuration  
 * @param {Object} credentials - Login credentials
 * @returns {Promise<boolean>} - Whether login succeeded
 */
function testLogin(serverConfig, credentials) {
  return new Promise((resolve) => {
    const postData = JSON.stringify(credentials);
    
    const options = {
      hostname: serverConfig.host,
      port: serverConfig.port,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (res.statusCode === 200 && response.success) {
            console.log(`✅ Login successful for ${credentials.email} on ${serverConfig.host}:${serverConfig.port}`);
            resolve(true);
          } else {
            console.log(`❌ Login failed for ${credentials.email} on ${serverConfig.host}:${serverConfig.port} - ${response.message || 'Unknown error'}`);
            resolve(false);
          }
        } catch (err) {
          console.log(`❌ Invalid response for ${credentials.email} on ${serverConfig.host}:${serverConfig.port}`);
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.log(`❌ Login request failed for ${credentials.email} on ${serverConfig.host}:${serverConfig.port} - ${err.message}`);
      resolve(false);
    });

    req.on('timeout', () => {
      console.log(`⏰ Login request timeout for ${credentials.email} on ${serverConfig.host}:${serverConfig.port}`);
      req.destroy();
      resolve(false);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('🧪 Starting Cloud Backup Login Flow Tests\n');
  
  // Test 1: Server Connectivity
  console.log('📡 Testing Server Connectivity:');
  const serverResults = {};
  
  for (const [name, config] of Object.entries(tests)) {
    serverResults[name] = await testServerConnection(config);
  }
  
  console.log('');
  
  // Test 2: Authentication Tests
  console.log('🔐 Testing Authentication:');
  
  if (serverResults.mainServer) {
    console.log('Testing Main Server Login:');
    await testLogin(tests.mainServer, credentials.admin);
    await testLogin(tests.mainServer, credentials.user);
  }
  
  if (serverResults.simpleServer) {
    console.log('Testing Simple Server Login:');
    await testLogin(tests.simpleServer, credentials.admin);
    await testLogin(tests.simpleServer, credentials.user);
  }
  
  console.log('');
  
  // Test 3: Summary
  console.log('📊 Test Summary:');
  console.log(`Main Server (port 5000): ${serverResults.mainServer ? '✅ Online' : '❌ Offline'}`);
  console.log(`Simple Server (port 3030): ${serverResults.simpleServer ? '✅ Online' : '❌ Offline'}`);
  console.log(`Frontend (port 3000): ${serverResults.frontend ? '✅ Online' : '❌ Offline'}`);
  
  if (!serverResults.mainServer && !serverResults.simpleServer) {
    console.log('\n⚠️  No backend servers are running! Please start the servers:');
    console.log('   1. cd backend && npm start (for main server on port 5000)');
    console.log('   2. cd backend && node simple-server.js (for fallback server on port 3030)');
    console.log('   3. cd frontend && npm start (for React app on port 3000)');
  } else if (!serverResults.frontend) {
    console.log('\n⚠️  Frontend is not running! Please start it:');
    console.log('   cd frontend && npm start');
  } else {
    console.log('\n🎉 All systems operational! You can now test login at:');
    console.log('   http://localhost:3000/login');
    console.log('\n   Test credentials:');
    console.log('   Admin: admin@altaro.com / admin123');
    console.log('   User: user@altaro.com / admin123');
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the tests
runTests().catch(console.error);
