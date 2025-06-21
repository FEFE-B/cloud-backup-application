const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Server running', timestamp: new Date().toISOString() });
});
app.get('/', (req, res) => {
  res.json({ message: 'Altaro Cloud Backup API - Test Server' });
});
app.post('/api/backup/restore/:historyId', (req, res) => {
  const { historyId } = req.params;
  const { targetDirectory } = req.body;
  if (!targetDirectory) {
    return res.status(400).json({ success: false, message: 'Target directory is required' });
  }
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  res.json({ success: true, message: 'Restore started (MOCK)', historyId, targetDirectory });
});
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password required' });
  }
  res.json({ success: true, token: 'mock-token-' + Date.now(), user: { id: 'test', name: 'Test User', email } });
});
const PORT = 5000;
app.listen(PORT, () => console.log('Server running on port ' + PORT));
