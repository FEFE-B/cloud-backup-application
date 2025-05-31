const mongoose = require('mongoose');
const User = require('../../../models/User');
const Backup = require('../../../models/Backup');
const Renewal = require('../../../models/Renewal');
const ActivityLog = require('../../../models/ActivityLog');
const adminController = require('../../../controllers/admin.controller');

// Mock the response object
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Admin Controller Tests', () => {
  let req, res;
  let mockUsers, mockBackups, mockRenewals, mockActivityLogs;

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
        role: 'user',
        company: 'Company 1',
        subscription: {
          plan: 'basic',
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          isActive: true
        }
      },
      {
        _id: new mongoose.Types.ObjectId(),
        name: 'Test User 2',
        email: 'user2@example.com',
        role: 'user',
        company: 'Company 2',
        subscription: {
          plan: 'premium',
          expiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          isActive: true
        }
      }
    ];
    
    mockBackups = [
      {
        _id: new mongoose.Types.ObjectId(),
        name: 'Test Backup 1',
        user: mockUsers[0]._id,
        status: 'active',
        backupType: 'file',
        size: 1024
      },
      {
        _id: new mongoose.Types.ObjectId(),
        name: 'Test Backup 2',
        user: mockUsers[1]._id,
        status: 'paused',
        backupType: 'database',
        size: 2048
      }
    ];
    
    mockRenewals = [
      {
        _id: new mongoose.Types.ObjectId(),
        user: mockUsers[0]._id,
        plan: 'basic',
        amount: 99.99,
        status: 'pending',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      },
      {
        _id: new mongoose.Types.ObjectId(),
        user: mockUsers[1]._id,
        plan: 'premium',
        amount: 199.99,
        status: 'paid',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      }
    ];
    
    mockActivityLogs = [
      {
        _id: new mongoose.Types.ObjectId(),
        user: mockUsers[0]._id,
        action: 'backup_created',
        details: 'Created a new backup',
        timestamp: new Date()
      },
      {
        _id: new mongoose.Types.ObjectId(),
        user: mockUsers[1]._id,
        action: 'renewal_paid',
        details: 'Paid renewal for premium plan',
        timestamp: new Date()
      }
    ];
    
    // Mock database queries
    User.find = jest.fn().mockResolvedValue(mockUsers);
    User.findById = jest.fn().mockImplementation((id) => {
      const user = mockUsers.find(u => u._id.toString() === id.toString());
      return {
        exec: jest.fn().mockResolvedValue(user)
      };
    });
    
    Backup.find = jest.fn().mockImplementation((query) => {
      if (query && query.user) {
        const userBackups = mockBackups.filter(b => b.user.toString() === query.user.toString());
        return {
          exec: jest.fn().mockResolvedValue(userBackups)
        };
      }
      return {
        exec: jest.fn().mockResolvedValue(mockBackups)
      };
    });
    
    Renewal.find = jest.fn().mockImplementation((query) => {
      if (query && query.user) {
        const userRenewals = mockRenewals.filter(r => r.user.toString() === query.user.toString());
        return {
          exec: jest.fn().mockResolvedValue(userRenewals)
        };
      }
      return {
        exec: jest.fn().mockResolvedValue(mockRenewals)
      };
    });
    
    ActivityLog.find = jest.fn().mockImplementation((query) => {
      if (query && query.user) {
        const userLogs = mockActivityLogs.filter(l => l.user.toString() === query.user.toString());
        return {
          exec: jest.fn().mockResolvedValue(userLogs)
        };
      }
      return {
        exec: jest.fn().mockResolvedValue(mockActivityLogs)
      };
    });
  });

  describe('getDashboardStats', () => {
    it('should return dashboard statistics', async () => {
      // Add mock implementations for aggregation
      User.countDocuments = jest.fn().mockResolvedValue(mockUsers.length);
      Backup.countDocuments = jest.fn().mockResolvedValue(mockBackups.length);
      Renewal.countDocuments = jest.fn().mockResolvedValue(mockRenewals.length);
      
      Renewal.aggregate = jest.fn().mockResolvedValue([{ total: 299.98 }]);
      
      await adminController.getDashboardStats(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          userCount: 2,
          backupCount: 2,
          renewalCount: 2,
          totalRevenue: 299.98,
          recentActivity: expect.any(Array)
        }
      });
    });
  });
  
  describe('getAllUsers', () => {
    it('should return all users', async () => {
      await adminController.getAllUsers(req, res);
      
      expect(User.find).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: 2,
        data: mockUsers
      });
    });
    
    it('should handle pagination', async () => {
      req.query = { page: '1', limit: '1' };
      
      User.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockUsers[0]])
          })
        })
      });
      
      User.countDocuments = jest.fn().mockResolvedValue(2);
      
      await adminController.getAllUsers(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: 2,
        data: [mockUsers[0]],
        pagination: {
          totalPages: 2,
          currentPage: 1,
          hasNextPage: true,
          hasPrevPage: false
        }
      });
    });
  });
  
  describe('getUserById', () => {
    it('should return a specific user by ID', async () => {
      req.params.id = mockUsers[0]._id;
      
      await adminController.getUserById(req, res);
      
      expect(User.findById).toHaveBeenCalledWith(mockUsers[0]._id);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUsers[0]
      });
    });
    
    it('should return 404 if user not found', async () => {
      req.params.id = new mongoose.Types.ObjectId();
      
      User.findById = jest.fn().mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(null)
      }));
      
      await adminController.getUserById(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'User not found'
      });
    });
  });
  
  describe('updateUser', () => {
    it('should update a user', async () => {
      req.params.id = mockUsers[0]._id;
      req.body = {
        name: 'Updated Name',
        company: 'Updated Company',
        role: 'admin'
      };
      
      const updatedUser = {
        ...mockUsers[0],
        name: 'Updated Name',
        company: 'Updated Company',
        role: 'admin'
      };
      
      User.findByIdAndUpdate = jest.fn().mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(updatedUser)
      }));
      
      await adminController.updateUser(req, res);
      
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        mockUsers[0]._id,
        { name: 'Updated Name', company: 'Updated Company', role: 'admin' },
        { new: true, runValidators: true }
      );
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: updatedUser
      });
    });
    
    it('should return 404 if user not found', async () => {
      req.params.id = new mongoose.Types.ObjectId();
      req.body = { name: 'Updated Name' };
      
      User.findByIdAndUpdate = jest.fn().mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(null)
      }));
      
      await adminController.updateUser(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'User not found'
      });
    });
  });
  
  describe('getUserBackups', () => {
    it('should return all backups for a specific user', async () => {
      req.params.userId = mockUsers[0]._id;
      
      await adminController.getUserBackups(req, res);
      
      expect(Backup.find).toHaveBeenCalledWith({ user: mockUsers[0]._id });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.calls[0][0].success).toBe(true);
      expect(res.json.mock.calls[0][0].data.length).toBe(1);
    });
    
    it('should return empty array if no backups found', async () => {
      req.params.userId = new mongoose.Types.ObjectId();
      
      Backup.find = jest.fn().mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue([])
      }));
      
      await adminController.getUserBackups(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: 0,
        data: []
      });
    });
  });
  
  describe('getUserRenewals', () => {
    it('should return all renewals for a specific user', async () => {
      req.params.userId = mockUsers[0]._id;
      
      await adminController.getUserRenewals(req, res);
      
      expect(Renewal.find).toHaveBeenCalledWith({ user: mockUsers[0]._id });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.calls[0][0].success).toBe(true);
      expect(res.json.mock.calls[0][0].data.length).toBe(1);
    });
  });
  
  describe('getUserActivityLogs', () => {
    it('should return activity logs for a specific user', async () => {
      req.params.userId = mockUsers[0]._id;
      
      await adminController.getUserActivityLogs(req, res);
      
      expect(ActivityLog.find).toHaveBeenCalledWith({ user: mockUsers[0]._id });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.calls[0][0].success).toBe(true);
      expect(res.json.mock.calls[0][0].data.length).toBe(1);
    });
  });
});
