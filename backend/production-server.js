// Production server with fallback database solutions
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');

// Load production environment variables
dotenv.config({ path: './.env.production' });

// Models
const User = require('./models/User');

// Routes
const authRoutes = require('./routes/auth.routes');
const backupRoutes = require('./routes/backup.routes');
const renewalRoutes = require('./routes/renewal.routes');
const userRoutes = require('./routes/user.routes');
const adminRoutes = require('./routes/admin.routes');
const errorRoutes = require('./routes/error.routes');

// Initialize Express
const app = express();

// CORS configuration for production
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'https://social-media-platform-app.netlify.app',
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection with fallback
async function connectDatabase() {
  const mongoURI = process.env.MONGO_URI;
  
  try {
    console.log('Attempting to connect to MongoDB...');
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // 10 seconds timeout
      connectTimeoutMS: 10000,
    });
    
    console.log('✅ MongoDB Connected Successfully');
    
    // Check if we have test users, if not create them
    await createTestUsers();
    
    return true;
  } catch (error) {
    console.error('❌ MongoDB Atlas connection failed:', error.message);
    console.log('🔄 Attempting to use alternative database solution...');
    
    // Try alternative MongoDB URI (Railway internal MongoDB if available)
    const altURI = process.env.RAILWAY_MONGO_URI || 'mongodb://mongo:27017/altaro-cloud-backup';
    
    try {
      await mongoose.connect(altURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
      });
      
      console.log('✅ Connected to alternative MongoDB');
      await createTestUsers();
      return true;
    } catch (altError) {
      console.error('❌ Alternative MongoDB connection failed:', altError.message);
      
      // Last resort: Use simplified in-memory approach for production
      console.log('🚀 Using in-memory database as fallback...');
      return await useInMemoryFallback();
    }
  }
}

// Fallback to in-memory database
async function useInMemoryFallback() {
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Using in-memory MongoDB for production (temporary solution)');
    await createTestUsers();
    return true;
  } catch (error) {
    console.error('❌ Failed to set up in-memory database:', error.message);
    return false;
  }
}

// Create test users for authentication
async function createTestUsers() {
  try {
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: 'admin@altaro.com' });
    if (existingAdmin) {
      console.log('✅ Test users already exist');
      return;
    }

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    
    // Create admin user
    const adminUser = await User.create({
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
    const regularUser = await User.create({
      name: 'Test User',
      email: 'user@altaro.com',
      password: 'admin123',
      company: 'Test Company',
      phone: '0987654321',
      role: 'user',
      subscription: {
        plan: 'basic',
        startDate: new Date(),
        expiryDate: expiryDate,
        autoRenew: false,
        paymentMethod: 'credit_card',
        paymentDetails: {
          lastFour: '5678',
          expiryDate: '06/26',
        },
        storageLimit: 100,
        isActive: true
      }
    });
    
    console.log('✅ Test users created successfully');
    console.log(`   - Admin: ${adminUser.email} / admin123`);
    console.log(`   - User: ${regularUser.email} / admin123`);
    
  } catch (error) {
    console.error('❌ Error creating test users:', error.message);
  }
}

// Health check endpoint with detailed status
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
  
  res.status(200).json({
    success: true,
    status: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: dbStatus,
    environment: process.env.NODE_ENV,
    corsOrigin: process.env.CORS_ORIGIN
  });
});

// Route middleware
app.use('/api/auth', authRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/renewals', renewalRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/errors', errorRoutes);

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
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Start server
async function startServer() {
  try {
    // Try to connect to database
    const dbConnected = await connectDatabase();
    
    if (!dbConnected) {
      console.error('❌ Failed to connect to any database. Exiting...');
      process.exit(1);
    }
    
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Production server running on port ${PORT}`);
      console.log(`🌐 CORS enabled for: ${process.env.CORS_ORIGIN}`);
      console.log(`🔗 Server URL: ${process.env.PORT ? `https://altaro-cloud-backup-production.up.railway.app` : `http://localhost:${PORT}`}`);
      console.log('🔐 Test credentials:');
      console.log('   - Admin: admin@altaro.com / admin123');
      console.log('   - User: user@altaro.com / admin123');
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error('Unhandled Promise Rejection:', err.message);
  process.exit(1);
});

// Start the server
startServer();

module.exports = app;
