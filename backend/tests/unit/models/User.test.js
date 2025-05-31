const mongoose = require('mongoose');
const User = require('../../../models/User');

describe('User Model Tests', () => {
  let userData;

  beforeEach(() => {
    userData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      company: 'Test Company',
      phone: '123-456-7890',
      role: 'user',
      subscription: {
        plan: 'basic',
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      }
    };
  });

  it('should create a new user successfully', async () => {
    const validUser = new User(userData);
    const savedUser = await validUser.save();
    
    // Verify saved user
    expect(savedUser._id).toBeDefined();
    expect(savedUser.name).toBe(userData.name);
    expect(savedUser.email).toBe(userData.email);
    expect(savedUser.company).toBe(userData.company);
    expect(savedUser.phone).toBe(userData.phone);
    expect(savedUser.role).toBe(userData.role);
    expect(savedUser.subscription.plan).toBe(userData.subscription.plan);

    // Verify password is hashed
    expect(savedUser.password).not.toBe(userData.password);
  });

  it('should fail to create user without required fields', async () => {
    const userWithoutRequiredField = new User({
      name: 'Test User',
      // email is missing
      password: 'password123'
    });

    let error;
    try {
      await userWithoutRequiredField.save();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors.email).toBeDefined();
    expect(error.errors.company).toBeDefined();
  });

  it('should fail to create user with invalid email', async () => {
    const userWithInvalidEmail = new User({
      ...userData,
      email: 'invalid-email'
    });

    let error;
    try {
      await userWithInvalidEmail.save();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors.email).toBeDefined();
  });

  it('should match password correctly', async () => {
    const user = new User(userData);
    await user.save();

    const isMatch = await user.matchPassword('password123');
    expect(isMatch).toBe(true);

    const isNotMatch = await user.matchPassword('wrongpassword');
    expect(isNotMatch).toBe(false);
  });

  it('should generate a valid JWT token', async () => {
    const user = new User(userData);
    await user.save();

    const token = user.getSignedJwtToken();
    
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
  });
});
