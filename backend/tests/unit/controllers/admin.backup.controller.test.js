const mongoose = require('mongoose');
const Backup = require('../../../models/Backup');
const User = require('../../../models/User');
const BackupHistory = require('../../../models/BackupHistory');
const ActivityLog = require('../../../models/ActivityLog');
const adminBackupController = require('../../../controllers/admin.backup.controller');
const emailService = require('../../../utils/auth/emailService');

// Mock the response object
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Admin Backup Controller Tests', () => {
  let req, res;
  let mockUsers, mockBackups, mockBackupHistory;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup req object with admin user
    req = {
      user: {
        id: new mongoose.Types.ObjectId(),
        role: 'admin'
      },
      params: {},
      body: {},
      query: {}
    };
    
    // Setup response
    res = mockResponse();
    
    // Create mock data
    mockUsers = [
      {
        _id: new mongoose.Types.ObjectId(),
        name: 'Test User 1',
        email: 'user1@example.com',
        role: 'user'
      },
      {
        _id: new mongoose.Types.ObjectId(),
        name: 'Test User 2',
        email: 'user2@example.com',
        role: 'user'
      }
    ];
    
    mockBackups = [
      {
        _id: new mongoose.Types.ObjectId(),
        name: 'Test Backup 1',
        description: 'Test description 1',
        user: mockUsers[0]._id,
        status: 'active',
        backupType: 'file',
        sourcePath: '/test/path1',
        size: 1024,
        schedule: {
          enabled: true,
          frequency: 'daily',
          time: '22:00'
        },
        lastRun: new Date(Date.now() - 24 * 60 * 60 * 1000),
        nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000),
        save: jest.fn().mockResolvedValue(true)
      },
      {
        _id: new mongoose.Types.ObjectId(),
        name: 'Test Backup 2',
        description: 'Test description 2',
        user: mockUsers[1]._id,
        status: 'paused',
        backupType: 'database',
        sourcePath: '/test/path2',
        size: 2048,
        schedule: {
          enabled: false,
          frequency: 'weekly',
          time: '03:00',
          day: 'Sunday'
        },
        lastRun: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        nextRun: null,
        save: jest.fn().mockResolvedValue(true)
      }
    ];
    
    mockBackupHistory = [
      {
        _id: new mongoose.Types.ObjectId(),
        backup: mockBackups[0]._id,
        user: mockUsers[0]._id,
        status: 'success',
        size: 1024,
        startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
        notes: 'Backup completed successfully'
      },
      {
        _id: new mongoose.Types.ObjectId(),
        backup: mockBackups[1]._id,
        user: mockUsers[1]._id,
        status: 'failed',
        size: 0,
        startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000),
        notes: 'Backup failed due to connection error'
      }
    ];
    
    // Mock database queries
    Backup.find = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockBackups)
    });
    
    Backup.findById = jest.fn().mockImplementation((id) => {
      const backup = mockBackups.find(b => b._id.toString() === id.toString());
      return {
        exec: jest.fn().mockResolvedValue(backup)
      };
    });
    
    BackupHistory.find = jest.fn().mockImplementation((query) => {
      if (query && query.backup) {
        const history = mockBackupHistory.filter(h => h.backup.toString() === query.backup.toString());
        return {
          exec: jest.fn().mockResolvedValue(history)
        };
      }
      return {
        exec: jest.fn().mockResolvedValue(mockBackupHistory)
      };
    });
    
    User.findById = jest.fn().mockImplementation((id) => {
      const user = mockUsers.find(u => u._id.toString() === id.toString());
      return {
        exec: jest.fn().mockResolvedValue(user)
      };
    });
    
    ActivityLog.create = jest.fn().mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      action: 'backup_status_changed',
      user: mockUsers[0]._id,
      details: 'Admin changed backup status',
      timestamp: new Date()
    });
  });

  describe('getAllBackups', () => {
    it('should return all backups', async () => {
      await adminBackupController.getAllBackups(req, res);
      
      expect(Backup.find).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: 2,
        data: mockBackups
      });
    });
    
    it('should handle pagination', async () => {
      req.query = { page: '1', limit: '1' };
      
      Backup.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockBackups[0]])
          })
        })
      });
      
      Backup.countDocuments = jest.fn().mockResolvedValue(2);
      
      await adminBackupController.getAllBackups(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: 2,
        data: [mockBackups[0]],
        pagination: {
          totalPages: 2,
          currentPage: 1,
          hasNextPage: true,
          hasPrevPage: false
        }
      });
    });
    
    it('should filter by status if provided', async () => {
      req.query = { status: 'active' };
      
      Backup.find = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockBackups[0]])
      });
      
      await adminBackupController.getAllBackups(req, res);
      
      expect(Backup.find).toHaveBeenCalledWith({ status: 'active' });
      expect(res.json.mock.calls[0][0].data).toEqual([mockBackups[0]]);
    });
  });
  
  describe('getBackupById', () => {
    it('should return a specific backup by ID', async () => {
      req.params.id = mockBackups[0]._id;
      
      await adminBackupController.getBackupById(req, res);
      
      expect(Backup.findById).toHaveBeenCalledWith(mockBackups[0]._id);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockBackups[0]
      });
    });
    
    it('should return 404 if backup not found', async () => {
      req.params.id = new mongoose.Types.ObjectId();
      
      Backup.findById = jest.fn().mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(null)
      }));
      
      await adminBackupController.getBackupById(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Backup not found'
      });
    });
  });
  
  describe('updateBackupStatus', () => {
    it('should update backup status', async () => {
      req.params.id = mockBackups[0]._id;
      req.body = {
        status: 'paused',
        reason: 'System maintenance'
      };
      
      const updatedBackup = {
        ...mockBackups[0],
        status: 'paused'
      };
      
      // Mock the backup being returned after update
      mockBackups[0].status = 'paused';
      
      await adminBackupController.updateBackupStatus(req, res);
      
      expect(mockBackups[0].save).toHaveBeenCalled();
      expect(ActivityLog.create).toHaveBeenCalled();
      expect(emailService.sendBackupStatusNotification).toHaveBeenCalled();
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: updatedBackup
      });
    });
    
    it('should return 404 if backup not found', async () => {
      req.params.id = new mongoose.Types.ObjectId();
      req.body = { status: 'paused' };
      
      Backup.findById = jest.fn().mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(null)
      }));
      
      await adminBackupController.updateBackupStatus(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Backup not found'
      });
    });
    
    it('should return 400 if invalid status provided', async () => {
      req.params.id = mockBackups[0]._id;
      req.body = { status: 'invalid_status' };
      
      await adminBackupController.updateBackupStatus(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0].success).toBe(false);
    });
  });
  
  describe('getBackupHistory', () => {
    it('should return history for a specific backup', async () => {
      req.params.id = mockBackups[0]._id;
      
      await adminBackupController.getBackupHistory(req, res);
      
      expect(BackupHistory.find).toHaveBeenCalledWith({ backup: mockBackups[0]._id });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.calls[0][0].success).toBe(true);
      expect(res.json.mock.calls[0][0].data.length).toBe(1);
    });
    
    it('should return empty array if no history found', async () => {
      req.params.id = new mongoose.Types.ObjectId();
      
      BackupHistory.find = jest.fn().mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue([])
      }));
      
      await adminBackupController.getBackupHistory(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: 0,
        data: []
      });
    });
  });
  
  describe('triggerBackup', () => {
    it('should trigger a manual backup', async () => {
      req.params.id = mockBackups[0]._id;
      
      // Mock backup executor
      const backupExecutor = require('../../../utils/scheduler/backupExecutor');
      backupExecutor.executeBackup = jest.fn().mockResolvedValue({
        status: 'success',
        size: 1024,
        message: 'Backup completed successfully'
      });
      
      await adminBackupController.triggerBackup(req, res);
      
      expect(backupExecutor.executeBackup).toHaveBeenCalledWith(mockBackups[0]);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.calls[0][0].success).toBe(true);
      expect(res.json.mock.calls[0][0].data.status).toBe('success');
    });
    
    it('should return 404 if backup not found', async () => {
      req.params.id = new mongoose.Types.ObjectId();
      
      Backup.findById = jest.fn().mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(null)
      }));
      
      await adminBackupController.triggerBackup(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Backup not found'
      });
    });
    
    it('should handle backup execution failure', async () => {
      req.params.id = mockBackups[0]._id;
      
      // Mock backup executor with failure
      const backupExecutor = require('../../../utils/scheduler/backupExecutor');
      backupExecutor.executeBackup = jest.fn().mockRejectedValue(new Error('Backup failed'));
      
      await adminBackupController.triggerBackup(req, res);
      
      expect(backupExecutor.executeBackup).toHaveBeenCalledWith(mockBackups[0]);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json.mock.calls[0][0].success).toBe(false);
      expect(res.json.mock.calls[0][0].error).toBe('Backup failed');
    });
  });
});
