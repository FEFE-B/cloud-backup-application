const emailService = require('../../../utils/auth/emailService');

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' })
  })
}));

describe('Email Service Tests', () => {
  beforeEach(() => {
    // Set environment variables for testing
    process.env.EMAIL_HOST = 'smtp.test.com';
    process.env.EMAIL_PORT = '587';
    process.env.EMAIL_USER = 'test@example.com';
    process.env.EMAIL_PASSWORD = 'testpassword';
    process.env.EMAIL_FROM = 'noreply@altaro.com';
    process.env.CLIENT_URL = 'https://test.altaro.com';
  });

  describe('sendEmail', () => {
    it('should send an email successfully', async () => {
      const emailOptions = {
        email: 'recipient@example.com',
        subject: 'Test Subject',
        message: 'Test message body',
        html: '<p>Test HTML body</p>'
      };

      const result = await emailService.sendEmail(emailOptions);
      
      expect(result).toBeDefined();
      expect(result.messageId).toBe('test-message-id');
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should format and send a password reset email', async () => {
      const spy = jest.spyOn(emailService, 'sendEmail');
      
      await emailService.sendPasswordResetEmail(
        'user@example.com', 
        'https://test.altaro.com/reset-password/token123'
      );
      
      expect(spy).toHaveBeenCalled();
      expect(spy.mock.calls[0][0].email).toBe('user@example.com');
      expect(spy.mock.calls[0][0].subject).toContain('Password Reset');
      expect(spy.mock.calls[0][0].html).toContain('https://test.altaro.com/reset-password/token123');
      
      spy.mockRestore();
    });
  });

  describe('sendRenewalReminder', () => {
    it('should format and send a renewal reminder email', async () => {
      const spy = jest.spyOn(emailService, 'sendEmail');
      
      const dueDate = new Date('2023-12-31');
      
      await emailService.sendRenewalReminder(
        'user@example.com',
        'John Doe',
        'premium',
        199.99,
        dueDate
      );
      
      expect(spy).toHaveBeenCalled();
      expect(spy.mock.calls[0][0].email).toBe('user@example.com');
      expect(spy.mock.calls[0][0].subject).toContain('Renewal Reminder');
      expect(spy.mock.calls[0][0].html).toContain('John Doe');
      expect(spy.mock.calls[0][0].html).toContain('premium');
      expect(spy.mock.calls[0][0].html).toContain('$199.99');
      expect(spy.mock.calls[0][0].html).toContain('December 31, 2023');
      
      spy.mockRestore();
    });
  });

  describe('sendPaymentConfirmation', () => {
    it('should format and send a payment confirmation email', async () => {
      const spy = jest.spyOn(emailService, 'sendEmail');
      
      const expiryDate = new Date('2024-12-31');
      
      await emailService.sendPaymentConfirmation(
        'user@example.com',
        'John Doe',
        'premium',
        199.99,
        expiryDate
      );
      
      expect(spy).toHaveBeenCalled();
      expect(spy.mock.calls[0][0].email).toBe('user@example.com');
      expect(spy.mock.calls[0][0].subject).toContain('Payment Confirmation');
      expect(spy.mock.calls[0][0].html).toContain('John Doe');
      expect(spy.mock.calls[0][0].html).toContain('premium');
      expect(spy.mock.calls[0][0].html).toContain('$199.99');
      expect(spy.mock.calls[0][0].html).toContain('December 31, 2024');
      
      spy.mockRestore();
    });
  });

  describe('sendBackupStatusNotification', () => {
    it('should format and send a backup status notification email', async () => {
      const spy = jest.spyOn(emailService, 'sendEmail');
      
      await emailService.sendBackupStatusNotification(
        'user@example.com',
        'John Doe',
        'Weekly Backup',
        'success',
        'Backup completed with 100MB data'
      );
      
      expect(spy).toHaveBeenCalled();
      expect(spy.mock.calls[0][0].email).toBe('user@example.com');
      expect(spy.mock.calls[0][0].subject).toContain('Backup');
      expect(spy.mock.calls[0][0].html).toContain('John Doe');
      expect(spy.mock.calls[0][0].html).toContain('Weekly Backup');
      expect(spy.mock.calls[0][0].html).toContain('Completed Successfully');
      expect(spy.mock.calls[0][0].html).toContain('100MB data');
      
      spy.mockRestore();
    });

    it('should handle different status types correctly', async () => {
      const spy = jest.spyOn(emailService, 'sendEmail');
      
      await emailService.sendBackupStatusNotification(
        'user@example.com',
        'John Doe',
        'Weekly Backup',
        'failed',
        'Insufficient storage space'
      );
      
      expect(spy).toHaveBeenCalled();
      expect(spy.mock.calls[0][0].subject).toContain('Failed');
      expect(spy.mock.calls[0][0].html).toContain('Failed');
      expect(spy.mock.calls[0][0].html).toContain('Insufficient storage space');
      
      spy.mockRestore();
    });
  });
});
