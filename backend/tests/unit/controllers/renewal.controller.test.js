const mongoose = require('mongoose');
const Renewal = require('../../../models/Renewal');
const User = require('../../../models/User');
const renewalController = require('../../../controllers/renewal.controller');
const emailService = require('../../../utils/auth/emailService');

// Mock the response object
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Renewal Controller Tests', () => {
  let req, res, mockUser, mockRenewal;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup req object
    req = {
      user: {
        id: new mongoose.Types.ObjectId()
      },
      params: {},
      body: {}
    };
    
    // Setup response
    res = mockResponse();
    
    // Create mock user and renewal
    mockUser = {
      _id: req.user.id,
      name: 'Test User',
      email: 'test@example.com',
      subscription: {
        plan: 'basic',
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true
      },
      save: jest.fn().mockResolvedValue(true)
    };
    
    mockRenewal = {
      _id: new mongoose.Types.ObjectId(),
      user: req.user.id,
      plan: 'basic',
      amount: 99.99,
      status: 'pending',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      save: jest.fn().mockResolvedValue(true)
    };
    
    // Mock database calls
    User.findById = jest.fn().mockResolvedValue(mockUser);
    Renewal.findById = jest.fn().mockResolvedValue(mockRenewal);
    Renewal.find = jest.fn().mockResolvedValue([mockRenewal]);
    Renewal.create = jest.fn().mockResolvedValue(mockRenewal);
  });
  
  describe('getUserRenewals', () => {
    it('should get all renewals for the user', async () => {
      await renewalController.getUserRenewals(req, res);
      
      expect(Renewal.find).toHaveBeenCalledWith({ user: req.user.id });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: 1,
        data: [mockRenewal]
      });
    });
    
    it('should return empty array when no renewals exist', async () => {
      Renewal.find = jest.fn().mockResolvedValue([]);
      
      await renewalController.getUserRenewals(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: 0,
        data: []
      });
    });
  });
  
  describe('getRenewalById', () => {
    it('should get a specific renewal by ID', async () => {
      req.params.id = mockRenewal._id;
      
      await renewalController.getRenewalById(req, res);
      
      expect(Renewal.findById).toHaveBeenCalledWith(mockRenewal._id);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockRenewal
      });
    });
    
    it('should return 404 if renewal not found', async () => {
      req.params.id = new mongoose.Types.ObjectId();
      Renewal.findById = jest.fn().mockResolvedValue(null);
      
      await renewalController.getRenewalById(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Renewal not found'
      });
    });
    
    it('should return 401 if user tries to access another user\'s renewal', async () => {
      req.params.id = mockRenewal._id;
      mockRenewal.user = new mongoose.Types.ObjectId(); // Different user
      
      await renewalController.getRenewalById(req, res);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Not authorized to access this renewal'
      });
    });
  });
  
  describe('createRenewal', () => {
    it('should create a new renewal', async () => {
      req.body = {
        plan: 'premium',
        amount: 199.99
      };
      
      await renewalController.createRenewal(req, res);
      
      expect(Renewal.create).toHaveBeenCalledWith({
        user: req.user.id,
        plan: 'premium',
        amount: 199.99,
        status: 'pending',
        dueDate: expect.any(Date)
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockRenewal
      });
    });
    
    it('should return 400 if required fields are missing', async () => {
      req.body = {
        // Missing plan
        amount: 199.99
      };
      
      await renewalController.createRenewal(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0].success).toBe(false);
    });
  });
  
  describe('processRenewalPayment', () => {
    it('should process a renewal payment successfully', async () => {
      req.params.id = mockRenewal._id;
      req.body = {
        paymentMethod: 'credit_card',
        amount: 99.99
      };
      
      await renewalController.processRenewalPayment(req, res);
      
      expect(mockRenewal.save).toHaveBeenCalled();
      expect(mockRenewal.status).toBe('paid');
      expect(mockRenewal.payments.length).toBeGreaterThan(0);
      expect(emailService.sendPaymentConfirmation).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockRenewal
      });
    });
    
    it('should return 400 if payment amount does not match renewal amount', async () => {
      req.params.id = mockRenewal._id;
      req.body = {
        paymentMethod: 'credit_card',
        amount: 50.00 // Different amount
      };
      
      await renewalController.processRenewalPayment(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0].success).toBe(false);
    });
  });
});
