// Simple in-memory database for testing without MongoDB
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// In-memory data store
const users = [];
const backups = [];
const renewals = [];

// Default admin user
const defaultAdmin = {
  id: '1',
  email: 'admin@cloudbackup.com',
  password: bcrypt.hashSync('admin123', 10),
  firstName: 'Admin',
  lastName: 'User',
  role: 'admin',
  isActive: true,
  createdAt: new Date()
};

const defaultUser = {
  id: '2',
  email: 'user@cloudbackup.com',
  password: bcrypt.hashSync('user123', 10),
  firstName: 'Test',
  lastName: 'User',
  role: 'user',
  isActive: true,
  createdAt: new Date()
};

// Add default users
users.push(defaultAdmin, defaultUser);

class MemoryDB {
  // User operations
  static async findUserByEmail(email) {
    return users.find(user => user.email === email);
  }

  static async findUserById(id) {
    return users.find(user => user.id === id);
  }

  static async createUser(userData) {
    const newUser = {
      id: (users.length + 1).toString(),
      ...userData,
      createdAt: new Date()
    };
    users.push(newUser);
    return newUser;
  }

  static async updateUser(id, updateData) {
    const userIndex = users.findIndex(user => user.id === id);
    if (userIndex !== -1) {
      users[userIndex] = { ...users[userIndex], ...updateData };
      return users[userIndex];
    }
    return null;
  }

  // Auth operations
  static async login(email, password) {
    const user = await this.findUserByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid password');
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: process.env.JWT_EXPIRE || '30d' }
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    };
  }

  static async register(userData) {
    const existingUser = await this.findUserByEmail(userData.email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const newUser = await this.createUser({
      ...userData,
      password: hashedPassword,
      role: userData.role || 'user'
    });

    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email, role: newUser.role },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: process.env.JWT_EXPIRE || '30d' }
    );

    return {
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role
      }
    };
  }

  // Get all data for debugging
  static getAll() {
    return { users, backups, renewals };
  }
}

module.exports = MemoryDB;
