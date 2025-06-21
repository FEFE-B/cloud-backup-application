// Simple WebSocket Test Server
const http = require('http');
const server = http.createServer();
console.log('Test server starting...');
server.listen(3002, () => {
    console.log('Test server running on port 3002');
});
