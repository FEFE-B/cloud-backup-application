const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../../models/User');
const Backup = require('../../models/Backup');
const Renewal = require('../../models/Renewal');
const ActivityLog = require('../../models/ActivityLog');

// Import your server app (make sure to export the app from server.js)
let app;
let mongoServer;
let adminToken;
let userToken;
let adminUser;
let regularUser;
let testBackup;
let testRenewal;

describe('Admin E2E Tests', () => {
  beforeAll(async () => {
    // Setup in-memory MongoDB for E2E tests
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.JWT_EXPIRE = '1h';
    process.env.NODE_ENV = 'test';
    process.env.MONGO_URI = mongoUri;
    
    // This dynamically imports the app after setting env variables
    const serverModule = require('../../server');
    app = serverModule.app;  // Make sure your server.js exports the app
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
  });

  afterAll(async () => {
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear database collections
    await User.deleteMany({});
    await Backup.deleteMany({});
    await Renewal.deleteMany({});
    await ActivityLog.deleteMany({});
    
    // Create admin user
    adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'adminpass',
      role: 'admin',
      company: 'Admin Company'
    });
    
    // Create regular user
    regularUser = await User.create({
      name: 'Regular User',
      email: 'user@example.com',
      password: 'userpass',
      role: 'user',
      company: 'User Company',
      subscription: {
        plan: 'basic',
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true
      }
    });
    
    // Create a backup for the regular user
    testBackup = await Backup.create({
      name: 'Test Backup',
      description: 'Test backup description',
      user: regularUser._id,
      status: 'active',
      backupType: 'file',
      sourcePath: '/test/path',
      size: 1024,
      schedule: {
        enabled: true,
        frequency: 'daily',
        time: '22:00'
      }
    });
    
    // Create a renewal for the regular user
    testRenewal = await Renewal.create({
      user: regularUser._id,
      plan: 'basic',
      amount: 99.99,
      status: 'pending',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
    
    // Login as admin and get token
    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'adminpass'
      });
    adminToken = adminLoginRes.body.token;
    
    // Login as regular user and get token
    const userLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'user@example.com',
        password: 'userpass'
      });
    userToken = userLoginRes.body.token;
  });

  describe('Admin Authorization', () => {
    it('should allow admin to access admin routes', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
    
    it('should prevent regular users from accessing admin routes', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Admin User Management', () => {
    it('should get all users', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
    });
    
    it('should get a specific user by ID', async () => {
      const res = await request(app)
        .get(`/api/admin/users/${regularUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Regular User');
      expect(res.body.data.email).toBe('user@example.com');
    });
    
    it('should update a user', async () => {
      const res = await request(app)
        .put(`/api/admin/users/${regularUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated User Name',
          company: 'Updated Company'
        });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated User Name');
      expect(res.body.data.company).toBe('Updated Company');
      
      // Verify the user was updated in the database
      const updatedUser = await User.findById(regularUser._id);
      expect(updatedUser.name).toBe('Updated User Name');
    });
    
    it('should get user backups', async () => {
      const res = await request(app)
        .get(`/api/admin/users/${regularUser._id}/backups`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe('Test Backup');
    });
    
    it('should get user renewals', async () => {
      const res = await request(app)
        .get(`/api/admin/users/${regularUser._id}/renewals`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].plan).toBe('basic');
      expect(res.body.data[0].amount).toBe(99.99);
    });
  });

  describe('Admin Renewal Management', () => {
    it('should get all renewals', async () => {
      const res = await request(app)
        .get('/api/admin/renewals')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
    });
    
    it('should get renewal details', async () => {
      const res = await request(app)
        .get(`/api/admin/renewals/${testRenewal._id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.plan).toBe('basic');
      expect(res.body.data.amount).toBe(99.99);
      expect(res.body.data.status).toBe('pending');
    });
    
    it('should update renewal status', async () => {
      const res = await request(app)
        .put(`/api/admin/renewals/${testRenewal._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'paid'
        });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('paid');
      
      // Verify the renewal was updated in the database
      const updatedRenewal = await Renewal.findById(testRenewal._id);
      expect(updatedRenewal.status).toBe('paid');
    });
    
    it('should process renewal payment', async () => {
      const res = await request(app)
        .post(`/api/admin/renewals/${testRenewal._id}/process-payment`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amount: 99.99,
          paymentMethod: 'bank_transfer',
          notes: 'Manual payment processed by admin'
        });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.renewal.status).toBe('paid');
      
      // Verify payment was recorded
      const updatedRenewal = await Renewal.findById(testRenewal._id);
      expect(updatedRenewal.payments.length).toBe(1);
      expect(updatedRenewal.payments[0].amount).toBe(99.99);
      expect(updatedRenewal.payments[0].method).toBe('bank_transfer');
    });
  });

  describe('Admin Backup Management', () => {
    it('should get all backups', async () => {
      const res = await request(app)
        .get('/api/admin/backups')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
    });
    
    it('should update backup status', async () => {
      const res = await request(app)
        .put(`/api/admin/backups/${testBackup._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'paused',
          reason: 'System maintenance'
        });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('paused');
      
      // Verify the backup was updated in the database
      const updatedBackup = await Backup.findById(testBackup._id);
      expect(updatedBackup.status).toBe('paused');
      
      // Verify activity log was created
      const activityLog = await ActivityLog.findOne({ 
        action: 'backup_status_changed',
        user: regularUser._id
      });
      expect(activityLog).toBeDefined();
      expect(activityLog.details).toContain('System maintenance');
    });
  });
});
