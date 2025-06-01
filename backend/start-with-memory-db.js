// Start the server with an in-memory MongoDB for testing
const express = require('express');
const cors = require('cors');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');
const crypto = require('crypto');

// Load environment variables
dotenv.config({ path: './config/.env' });

// Models
const User = require('./models/User');

// Routes
const authRoutes = require('./routes/auth.routes');
const backupRoutes = require('./routes/backup.routes');
const renewalRoutes = require('./routes/renewal.routes');
const userRoutes = require('./routes/user.routes');
const adminRoutes = require('./routes/admin.routes');

// Initialize Express
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up MongoDB Memory Server
async function startServer() {
  try {
    // Create an in-memory MongoDB instance
    const mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    console.log('MongoDB Memory Server URI:', mongoUri);
    
    // Connect to the in-memory database
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to in-memory MongoDB');
    
    // Create test users
    await createTestUsers();
    
    // Route middleware
    app.use('/api/auth', authRoutes);
    app.use('/api/backup', backupRoutes);
    app.use('/api/renewals', renewalRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/admin', adminRoutes);
    
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
    const PORT = 5001; // Use a different port
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Test users created. You can login with:`);
      console.log(`- Admin: admin@altaro.com / admin123`);
      console.log(`- User: user@altaro.com / admin123`);
    });
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
}

// Create test users for the in-memory database
async function createTestUsers() {
  try {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    
    // Create admin user
    await User.create({
      name: 'Admin User',
      email: 'admin@altaro.com',
      password: 'admin123',
      company: 'Altaro Software',
      phone: '1234567890',
      role: 'admin',
      subscription: {
        plan: 'enterprise',
        startDate: new Date(),
        expiryDate: expiryDate,
        autoRenew: true,
        paymentMethod: 'credit_card',
        paymentDetails: {
          lastFour: '1234',
          expiryDate: '12/25',
        },
        storageLimit: 1000,
        isActive: true
      }
    });
    
    // Create regular user
    await User.create({
      name: 'Test User',
      email: 'user@altaro.com',
      password: 'admin123',
      company: 'Test Company',
      phone: '9876543210',
      role: 'user',
      subscription: {
        plan: 'basic',
        startDate: new Date(),
        expiryDate: expiryDate,
        autoRenew: false,
        paymentMethod: 'none',
        storageLimit: 50,
        isActive: true
      }
    });
    
    console.log('Test users created successfully');
  } catch (err) {
    console.error('Error creating test users:', err);
    throw err;
  }
}

// Start the server
startServer();
