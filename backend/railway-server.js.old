// Railway Production Server with Enhanced Error Handling
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Initialize Express
const app = express();

// Environment variables with defaults
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_jwt_secret_for_development';

// CORS configuration for production
const corsOptions = {
  origin: [
    'https://social-media-platform-app.netlify.app',
    'http://localhost:3000'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory database fallback
let memoryDB = {
  users: [
    {
      _id: '1',
      email: 'admin@altaro.com',
      password: '$2a$10$7xZXQQpJB5DqhOq8yFl8m.8e1n2cVbG3RRRgSQQ4y9tPpVwGQ5dKu', // admin123
      role: 'admin',
      name: 'Admin User'
    },
    {
      _id: '2', 
      email: 'user@altaro.com',
      password: '$2a$10$7xZXQQpJB5DqhOq8yFl8m.8e1n2cVbG3RRRgSQQ4y9tPpVwGQ5dKu', // admin123
      role: 'user',
      name: 'Test User'
    }
  ],
  backups: [],
  renewals: []
};

// Database connection status
let isMongoConnected = false;

// Try to connect to MongoDB
async function connectMongoDB() {
  const mongoURI = process.env.MONGO_URI;
  
  if (!mongoURI || mongoURI.includes('[USERNAME]') || mongoURI.includes('[PASSWORD]')) {
    console.log('⚠️ MongoDB URI not properly configured, using in-memory database');
    return false;
  }

  try {
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });
    
    console.log('✅ MongoDB Connected Successfully');
    isMongoConnected = true;
    return true;
  } catch (error) {
    console.log('❌ MongoDB Connection Failed:', error.message);
    console.log('🔄 Falling back to in-memory database');
    return false;
  }
}

// Initialize database connection
connectMongoDB();

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    mongodb: isMongoConnected ? 'Connected' : 'Disconnected (using fallback)',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    mongodb: isMongoConnected ? 'Connected' : 'Disconnected (using fallback)',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user in memory database
    const user = memoryDB.users.find(u => u.email === email);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email,
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during login',
      error: error.message
    });
  }
});

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and name are required'
      });
    }

    // Check if user already exists
    const existingUser = memoryDB.users.find(u => u.email === email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user
    const newUser = {
      _id: Date.now().toString(),
      email,
      password: hashedPassword,
      name,
      role: 'user'
    };
    
    memoryDB.users.push(newUser);

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: newUser._id, 
        email: newUser.email,
        role: newUser.role 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        id: newUser._id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during registration',
      error: error.message
    });
  }
});

// Dashboard endpoint
app.get('/api/dashboard', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      totalUsers: memoryDB.users.length,
      totalBackups: memoryDB.backups.length,
      totalRenewals: memoryDB.renewals.length,
      serverStatus: 'Running',
      databaseStatus: isMongoConnected ? 'MongoDB Connected' : 'Memory Database'
    }
  });
});

// User profile endpoint
app.get('/api/users/profile', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: 'No authorization header'
    });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const user = memoryDB.users.find(u => u._id === decoded.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
    
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 CORS Origin: ${corsOptions.origin}`);
  console.log(`💾 Database: ${isMongoConnected ? 'MongoDB' : 'Memory (fallback)'}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  if (isMongoConnected) {
    mongoose.connection.close(() => {
      console.log('MongoDB connection closed.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

module.exports = app;
