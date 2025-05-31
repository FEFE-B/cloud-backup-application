// Main server file for Altaro Cloud Backup Software
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const cron = require('node-cron');

// Load environment variables
dotenv.config({ path: './config/.env' });

// Initialize Express
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const authRoutes = require('./routes/auth.routes');
const backupRoutes = require('./routes/backup.routes');
const renewalRoutes = require('./routes/renewal.routes');
const userRoutes = require('./routes/user.routes');
const adminRoutes = require('./routes/admin.routes');

// Database connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Connection Error:', err));

// Route middleware
app.use('/api/auth', authRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/renewals', renewalRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// Schedule renewal notification jobs
const { checkForUpcomingRenewals } = require('./controllers/renewal.controller');

// Run renewal check every day at 8:00 AM
cron.schedule('0 8 * * *', () => {
  console.log('Running renewal notification check...');
  checkForUpcomingRenewals();
});

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend/build', 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ message: 'Something went wrong!' });
});

// Set port and start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
