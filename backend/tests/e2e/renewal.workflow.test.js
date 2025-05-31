const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../../models/User');
const Renewal = require('../../models/Renewal');
const ActivityLog = require('../../models/ActivityLog');
const emailService = require('../../utils/auth/emailService');

// Import your server app
let app;
let mongoServer;
let adminToken;
let userToken;
let adminUser;
let regularUser;
let testRenewal;

describe('Renewal Workflow E2E Tests', () => {
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
    app = serverModule.app;
    
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
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        isActive: true
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
    
    // Mock email service
    jest.spyOn(emailService, 'sendRenewalReminder').mockResolvedValue(true);
    jest.spyOn(emailService, 'sendPaymentConfirmation').mockResolvedValue(true);
  });

  describe('Renewal Complete Workflow', () => {
    it('should go through the complete renewal lifecycle', async () => {
      // Step 1: User views their upcoming renewals
      const userRenewalsRes = await request(app)
        .get('/api/renewals')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(userRenewalsRes.statusCode).toBe(200);
      expect(userRenewalsRes.body.success).toBe(true);
      expect(userRenewalsRes.body.data.length).toBe(1);
      expect(userRenewalsRes.body.data[0].plan).toBe('basic');
      expect(userRenewalsRes.body.data[0].amount).toBe(99.99);
      
      // Step 2: User views a specific renewal
      const renewalDetailsRes = await request(app)
        .get(`/api/renewals/${testRenewal._id}`)
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(renewalDetailsRes.statusCode).toBe(200);
      expect(renewalDetailsRes.body.success).toBe(true);
      expect(renewalDetailsRes.body.data._id).toBe(testRenewal._id.toString());
      
      // Step 3: User upgrades their plan for the next renewal
      const upgradeRes = await request(app)
        .put(`/api/renewals/${testRenewal._id}/plan`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          plan: 'premium'
        });
      
      expect(upgradeRes.statusCode).toBe(200);
      expect(upgradeRes.body.success).toBe(true);
      expect(upgradeRes.body.data.plan).toBe('premium');
      expect(upgradeRes.body.data.amount).toBeGreaterThan(99.99); // Premium should cost more
      
      // Step 4: User initiates payment
      const paymentInitiationRes = await request(app)
        .post(`/api/renewals/${testRenewal._id}/payment-intent`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          paymentMethod: 'credit_card'
        });
      
      expect(paymentInitiationRes.statusCode).toBe(200);
      expect(paymentInitiationRes.body.success).toBe(true);
      expect(paymentInitiationRes.body.data.clientSecret).toBeDefined();
      
      // Step 5: Admin views all renewals
      const adminRenewalsRes = await request(app)
        .get('/api/admin/renewals')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(adminRenewalsRes.statusCode).toBe(200);
      expect(adminRenewalsRes.body.success).toBe(true);
      expect(adminRenewalsRes.body.data.length).toBeGreaterThan(0);
      
      // Step 6: Admin views the specific user's renewal
      const adminRenewalDetailsRes = await request(app)
        .get(`/api/admin/renewals/${testRenewal._id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(adminRenewalDetailsRes.statusCode).toBe(200);
      expect(adminRenewalDetailsRes.body.success).toBe(true);
      expect(adminRenewalDetailsRes.body.data.plan).toBe('premium');
      
      // Step 7: Admin processes the payment manually
      const processPaymentRes = await request(app)
        .post(`/api/admin/renewals/${testRenewal._id}/process-payment`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amount: adminRenewalDetailsRes.body.data.amount,
          paymentMethod: 'bank_transfer',
          notes: 'Payment received via bank transfer'
        });
      
      expect(processPaymentRes.statusCode).toBe(200);
      expect(processPaymentRes.body.success).toBe(true);
      expect(processPaymentRes.body.data.renewal.status).toBe('paid');
      
      // Step 8: Verify payment confirmation email was sent
      expect(emailService.sendPaymentConfirmation).toHaveBeenCalled();
      
      // Step 9: Verify user subscription was updated
      const userProfileRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(userProfileRes.statusCode).toBe(200);
      expect(userProfileRes.body.success).toBe(true);
      expect(userProfileRes.body.data.subscription.plan).toBe('premium');
      
      // Step 10: Verify activity log was created
      const activityLogsRes = await request(app)
        .get('/api/admin/activity-logs')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(activityLogsRes.statusCode).toBe(200);
      expect(activityLogsRes.body.success).toBe(true);
      
      const paymentLog = activityLogsRes.body.data.find(
        log => log.action === 'renewal_payment_processed' && 
              log.user.toString() === regularUser._id.toString()
      );
      
      expect(paymentLog).toBeDefined();
    });
  });

  describe('Renewal Reminder Workflow', () => {
    it('should send renewal reminders to users with expiring subscriptions', async () => {
      // Create a user with soon-to-expire subscription
      const expiringUser = await User.create({
        name: 'Expiring User',
        email: 'expiring@example.com',
        password: 'password123',
        role: 'user',
        company: 'Expiring Company',
        subscription: {
          plan: 'basic',
          expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
          isActive: true
        }
      });
      
      // Create a renewal for this user
      await Renewal.create({
        user: expiringUser._id,
        plan: 'basic',
        amount: 99.99,
        status: 'pending',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      });
      
      // Trigger the renewal reminder job manually
      const renewalNotifier = require('../../utils/scheduler/renewalNotifier');
      await renewalNotifier.sendRenewalReminders();
      
      // Verify email was sent to the expiring user
      expect(emailService.sendRenewalReminder).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'expiring@example.com',
          name: 'Expiring User'
        }),
        expect.any(Object)
      );
      
      // Email should not be sent to users with subscriptions not expiring soon
      expect(emailService.sendRenewalReminder).not.toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'user@example.com'
        }),
        expect.any(Object)
      );
    });
  });

  describe('Renewal Cancellation Workflow', () => {
    it('should allow users to cancel pending renewals', async () => {
      // User cancels their pending renewal
      const cancelRenewalRes = await request(app)
        .put(`/api/renewals/${testRenewal._id}/cancel`)
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(cancelRenewalRes.statusCode).toBe(200);
      expect(cancelRenewalRes.body.success).toBe(true);
      expect(cancelRenewalRes.body.data.status).toBe('cancelled');
      
      // Verify activity log was created
      const activityLogsRes = await request(app)
        .get('/api/admin/activity-logs')
        .set('Authorization', `Bearer ${adminToken}`);
      
      const cancellationLog = activityLogsRes.body.data.find(
        log => log.action === 'renewal_cancelled' && 
              log.user.toString() === regularUser._id.toString()
      );
      
      expect(cancellationLog).toBeDefined();
      
      // Admin should see the cancelled renewal
      const adminRenewalDetailsRes = await request(app)
        .get(`/api/admin/renewals/${testRenewal._id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(adminRenewalDetailsRes.statusCode).toBe(200);
      expect(adminRenewalDetailsRes.body.data.status).toBe('cancelled');
    });
    
    it('should not allow users to cancel already paid renewals', async () => {
      // First, make the renewal paid
      await Renewal.findByIdAndUpdate(
        testRenewal._id,
        { status: 'paid' },
        { new: true }
      );
      
      // User attempts to cancel a paid renewal
      const cancelRenewalRes = await request(app)
        .put(`/api/renewals/${testRenewal._id}/cancel`)
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(cancelRenewalRes.statusCode).toBe(400);
      expect(cancelRenewalRes.body.success).toBe(false);
    });
  });
});
