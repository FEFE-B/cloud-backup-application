/**
 * This script starts both the main server and the simple-server for testing
 * The simple-server runs on port 3030 and provides mock data for testing
 */
const { spawn } = require('child_process');
const path = require('path');

// Start main server
console.log('Starting main server on port 5000...');
const mainServer = spawn('node', ['server.js'], {
  stdio: 'inherit',
  env: { ...process.env, PORT: 5000 }
});

// Start simple-server for fallback
console.log('Starting simple-server on port 3030...');
const simpleServer = spawn('node', ['simple-server.js'], {
  stdio: 'inherit',
  env: { ...process.env, PORT: 3030 }
});

// Handle process exit
process.on('SIGINT', () => {
  console.log('Shutting down servers...');
  mainServer.kill();
  simpleServer.kill();
  process.exit();
});

console.log('Both servers running. Press Ctrl+C to exit.');
