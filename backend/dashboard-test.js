// Simple script to test dashboard API endpoint
const http = require('http');

// First get a token by logging in
const loginData = JSON.stringify({
  email: 'user@altaro.com',
  password: 'admin123'
});

const loginOptions = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
};

console.log('Getting authentication token...');

const loginReq = http.request(loginOptions, (loginRes) => {
  let data = '';
  loginRes.on('data', (chunk) => {
    data += chunk;
  });
  
  loginRes.on('end', () => {
    if (loginRes.statusCode !== 200) {
      console.error('Login failed with status code:', loginRes.statusCode);
      console.error('Response:', data);
      return;
    }
    
    try {
      const loginResponse = JSON.parse(data);
      const token = loginResponse.token;
      
      console.log('Login successful, got token');
      
      // Now try to access the dashboard endpoint with the token
      const dashboardOptions = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/dashboard',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };
      
      console.log('Testing dashboard endpoint with authentication...');
      
      const dashboardReq = http.request(dashboardOptions, (dashboardRes) => {
        console.log(`Dashboard API STATUS: ${dashboardRes.statusCode}`);
        
        let dashboardData = '';
        dashboardRes.on('data', (chunk) => {
          dashboardData += chunk;
        });
        
        dashboardRes.on('end', () => {
          console.log('DASHBOARD RESPONSE:');
          try {
            const parsedData = JSON.parse(dashboardData);
            console.log(JSON.stringify(parsedData, null, 2));
          } catch (e) {
            console.log('Raw response:', dashboardData);
          }
        });
      });
      
      dashboardReq.on('error', (e) => {
        console.error(`Problem with dashboard request: ${e.message}`);
      });
      
      dashboardReq.end();
      
    } catch (e) {
      console.error('Error parsing login response:', e.message);
    }
  });
});

loginReq.on('error', (e) => {
  console.error(`Problem with login request: ${e.message}`);
});

loginReq.write(loginData);
loginReq.end();
