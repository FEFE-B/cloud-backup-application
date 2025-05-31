// Simple test server for Altaro Cloud Backup
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Load environment variables
dotenv.config({ path: './config/.env' });

// Initialize Express
const app = express();

// Debug logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory data store for testing
const users = [
  {
    _id: '1',
    name: 'Admin User',
    email: 'admin@altaro.com',
    password: '$2a$10$o.cymvKeLJVYHfejqWThjObdg4zvI3QV/8V7zBfbjB9OeDS0WNZEG', // password: admin123
    role: 'admin',
    company: 'Altaro Software',
    phone: '123-456-7890',
    status: 'active',
    createdAt: new Date()
  },
  {
    _id: '2',
    name: 'Test User',
    email: 'user@altaro.com',
    password: '$2a$10$o.cymvKeLJVYHfejqWThjObdg4zvI3QV/8V7zBfbjB9OeDS0WNZEG', // password: admin123 (for testing)
    role: 'user',
    company: 'Test Company',
    phone: '987-654-3210',
    status: 'active',
    createdAt: new Date()
  }
];

const businesses = [];

// Authentication Routes
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  console.log('Login attempt:', { email, password });
  console.log('Available users:', users);
  
  // Find user by email
  const user = users.find(u => u.email === email);
  
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }  // Check if password matches
  console.log('Password check:', { provided: password, stored: user.password, isHashed: user.password.startsWith('$2a$') });
  
  const isMatch = user.password.startsWith('$2a$') 
    ? await bcrypt.compare(password, user.password)
    : password === user.password;
    
  console.log('Password match result:', isMatch);
    
  if (!isMatch) {
    console.log('Password mismatch - login failed');
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  // Create JWT token
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || 'secret_jwt_key',
    { expiresIn: '1d' }
  );

  // Remove password from response
  const { password: _, ...userWithoutPassword } = user;

  res.status(200).json({
    success: true,
    token,
    user: userWithoutPassword
  });
});

// Middleware to check if user is authenticated
const authenticate = (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token, authorization denied' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_jwt_key');
    
    // Add user from payload
    req.user = decoded;
    
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Token is not valid' });
  }
};

// Admin Routes
app.get('/api/admin/users', authenticate, (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Not authorized as admin' });
  }
  
  // Return users without passwords
  const usersWithoutPasswords = users.map(user => {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  });
  
  res.status(200).json({
    success: true,
    count: usersWithoutPasswords.length,
    data: usersWithoutPasswords
  });
});

// Register route
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, company } = req.body;
  
  // Simple validation
  if (!name || !email || !password || !company) {
    return res.status(400).json({ success: false, message: 'Please provide all required fields' });
  }
  
  // Check if user already exists
  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(400).json({ success: false, message: 'User already exists' });
  }
    // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create new user
  const user = {
    _id: (users.length + 1).toString(),
    name,
    email,
    password: hashedPassword,
    company,
    role: 'user',
    subscription: {
      plan: 'free',
      storageLimit: 5, // 5GB default
      isActive: true
    }
  };
  
  users.push(user);
  
  // Create JWT token
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || 'secret_jwt_key',
    { expiresIn: '1d' }
  );
  
  // Remove password from response
  const { password: _, ...userWithoutPassword } = user;
  
  res.status(201).json({
    success: true,
    token,
    user: userWithoutPassword
  });
});

// Admin route to add a business
app.post('/api/admin/businesses', authenticate, (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Not authorized as admin' });
  }
  
  const { name, email, contact, subscriptionType } = req.body;
  
  // Simple validation
  if (!name || !email) {
    return res.status(400).json({ success: false, message: 'Please provide name and email' });
  }
  
  // Create new business
  const newBusiness = {
    _id: (businesses.length + 1).toString(),
    name,
    email,
    contact,
    subscriptionType: subscriptionType || 'Basic',
    status: 'active',
    createdAt: new Date()
  };
  
  businesses.push(newBusiness);
  
  res.status(201).json({
    success: true,
    data: newBusiness
  });
});  // Get current authenticated user
app.get('/api/auth/me', authenticate, (req, res) => {
  const user = users.find(u => u._id === req.user.id);
  
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  
  // Remove password from response
  const { password, ...userWithoutPassword } = user;
  
  // Add debug log
  console.log('Authenticated user:', userWithoutPassword);
  
  res.status(200).json({
    success: true,
    user: userWithoutPassword
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'Server is running',
    timestamp: new Date().toISOString(),
    database: 'In-memory storage',
    endpoints: {
      login: '/api/auth/login',
      register: '/api/auth/register',
      me: '/api/auth/me'
    }
  });
});

// Dashboard endpoint
app.get('/api/dashboard', authenticate, (req, res) => {
  const mockData = {
    backupCount: 12,
    activeSubscriptions: 5,
    pendingRenewals: 2,
    recentBackups: [
      {
        _id: '1',
        name: 'Daily Backup - Documents',
        status: 'completed',
        lastRun: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      },
      {
        _id: '2',
        name: 'Weekly Backup - System',
        status: 'in_progress',
        lastRun: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        _id: '3',
        name: 'Monthly Backup - Media',
        status: 'failed',
        lastRun: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]
  };

  res.status(200).json(mockData);
});

// Start the server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
