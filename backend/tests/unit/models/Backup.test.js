const mongoose = require('mongoose');
const Backup = require('../../../models/Backup');
const User = require('../../../models/User');

describe('Backup Model Tests', () => {
  let userId;
  let backupData;

  beforeEach(async () => {
    // Create a test user first
    const user = new User({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      company: 'Test Company',
      role: 'user',
      subscription: {
        plan: 'basic',
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });
    
    const savedUser = await user.save();
    userId = savedUser._id;

    // Setup backup data
    backupData = {
      name: 'Test Backup',
      description: 'Test backup description',
      user: userId,
      status: 'active',
      backupType: 'file',
      sourcePath: '/test/source/path',
      size: 1024, // 1KB
      schedule: {
        enabled: true,
        frequency: 'daily',
        time: '22:00'
      }
    };
  });

  it('should create a new backup successfully', async () => {
    const backup = new Backup(backupData);
    const savedBackup = await backup.save();
    
    // Verify saved backup
    expect(savedBackup._id).toBeDefined();
    expect(savedBackup.name).toBe(backupData.name);
    expect(savedBackup.description).toBe(backupData.description);
    expect(savedBackup.user.toString()).toBe(userId.toString());
    expect(savedBackup.status).toBe(backupData.status);
    expect(savedBackup.backupType).toBe(backupData.backupType);
    expect(savedBackup.sourcePath).toBe(backupData.sourcePath);
    expect(savedBackup.size).toBe(backupData.size);
    expect(savedBackup.schedule.enabled).toBe(true);
    expect(savedBackup.schedule.frequency).toBe('daily');
    expect(savedBackup.schedule.time).toBe('22:00');
  });

  it('should fail to create backup without required fields', async () => {
    const backupWithoutName = new Backup({
      description: 'Test backup description',
      user: userId,
      // Name is missing
    });

    let error;
    try {
      await backupWithoutName.save();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors.name).toBeDefined();
  });

  it('should fail to create backup with invalid status', async () => {
    const backupWithInvalidStatus = new Backup({
      ...backupData,
      status: 'invalid-status' // Not in enum
    });

    let error;
    try {
      await backupWithInvalidStatus.save();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors.status).toBeDefined();
  });

  it('should update backup fields correctly', async () => {
    const backup = new Backup(backupData);
    await backup.save();
    
    // Update backup
    backup.name = 'Updated Backup Name';
    backup.description = 'Updated description';
    backup.status = 'paused';
    
    const updatedBackup = await backup.save();
    
    // Verify updates
    expect(updatedBackup.name).toBe('Updated Backup Name');
    expect(updatedBackup.description).toBe('Updated description');
    expect(updatedBackup.status).toBe('paused');
  });
});
