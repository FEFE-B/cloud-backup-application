const schedule = require('node-schedule');
const User = require('../../models/User');
const Renewal = require('../../models/Renewal');
const { sendEmail } = require('../auth/emailService');

// Configuration
const NOTIFICATION_DAYS = [30, 14, 7, 3, 1]; // Days before expiry to send notifications

/**
 * Initialize the renewal notification scheduler
 */
exports.initRenewalNotifier = () => {
  console.log('Initializing renewal notification system...');
  
  // Schedule daily check for renewals at 9 AM
  schedule.scheduleJob('0 9 * * *', checkRenewals);
  
  console.log('Renewal notification system initialized successfully');
};

/**
 * Check for upcoming renewals and send notifications
 */
const checkRenewals = async () => {
  try {
    console.log('Checking for upcoming renewals...');
    
    // Calculate dates for each notification period
    const today = new Date();
    const notificationDates = NOTIFICATION_DAYS.map(days => {
      const date = new Date(today);
      date.setDate(date.getDate() + days);
      // Set time to end of day to include all subscriptions expiring on that day
      date.setHours(23, 59, 59, 999);
      return { days, date };
    });
    
    // Find users with subscriptions expiring in the notification periods
    for (const { days, date } of notificationDates) {
      // Find users whose subscriptions expire on this exact day
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const users = await User.find({
        'subscription.expiryDate': {
          $gte: startOfDay,
          $lte: date
        },
        'subscription.isActive': true
      });
      
      console.log(`Found ${users.length} users with subscriptions expiring in ${days} days`);
      
      // Create renewal records and send notifications for each user
      for (const user of users) {
        await processUserRenewal(user, days);
      }
    }
    
    console.log('Renewal check completed successfully');
  } catch (error) {
    console.error('Error checking renewals:', error);
  }
};

/**
 * Process a user's renewal notification
 * @param {Object} user - User document
 * @param {number} daysRemaining - Days remaining until expiry
 */
const processUserRenewal = async (user, daysRemaining) => {
  try {
    // Check if there's already a pending renewal for this user
    const existingRenewal = await Renewal.findOne({
      user: user._id,
      status: { $in: ['pending', 'processing'] }
    });
    
    if (!existingRenewal) {
      // Create a new renewal record
      const renewal = await Renewal.create({
        user: user._id,
        amount: calculateRenewalAmount(user.subscription.plan),
        status: 'pending',
        plan: user.subscription.plan,
        currentExpiryDate: user.subscription.expiryDate,
        newExpiryDate: calculateNewExpiryDate(user.subscription.expiryDate),
        paymentMethod: user.subscription.paymentMethod,
        notificationsSent: [{
          days: daysRemaining,
          date: new Date()
        }]
      });
      
      // Send notification email
      await sendRenewalNotification(user, renewal, daysRemaining);
      
      console.log(`Created renewal notification for user ${user._id} (${daysRemaining} days remaining)`);
    } else {
      // Update existing renewal with new notification
      const alreadyNotified = existingRenewal.notificationsSent.some(n => n.days === daysRemaining);
      
      if (!alreadyNotified) {
        existingRenewal.notificationsSent.push({
          days: daysRemaining,
          date: new Date()
        });
        
        await existingRenewal.save();
        
        // Send notification email
        await sendRenewalNotification(user, existingRenewal, daysRemaining);
        
        console.log(`Updated renewal notification for user ${user._id} (${daysRemaining} days remaining)`);
      } else {
        console.log(`Skipping duplicate notification for user ${user._id} (${daysRemaining} days remaining)`);
      }
    }
    
    // If auto-renew is enabled and this is the final reminder (1 day), process automatic renewal
    if (user.subscription.autoRenew && daysRemaining === 1) {
      await processAutoRenewal(user);
    }
  } catch (error) {
    console.error(`Error processing renewal for user ${user._id}:`, error);
  }
};

/**
 * Calculate the renewal amount based on subscription plan
 * @param {string} plan - Subscription plan
 * @returns {number} - Renewal amount
 */
const calculateRenewalAmount = (plan) => {
  switch (plan) {
    case 'free':
      return 0;
    case 'basic':
      return 9.99;
    case 'premium':
      return 24.99;
    case 'enterprise':
      return 99.99;
    default:
      return 0;
  }
};

/**
 * Calculate the new expiry date (1 year from current expiry)
 * @param {Date} currentExpiry - Current expiry date
 * @returns {Date} - New expiry date
 */
const calculateNewExpiryDate = (currentExpiry) => {
  const newExpiry = new Date(currentExpiry);
  newExpiry.setFullYear(newExpiry.getFullYear() + 1);
  return newExpiry;
};

/**
 * Send a renewal notification email to the user
 * @param {Object} user - User document
 * @param {Object} renewal - Renewal document
 * @param {number} daysRemaining - Days remaining until expiry
 */
const sendRenewalNotification = async (user, renewal, daysRemaining) => {
  try {
    const subject = `Your Altaro Cloud Backup subscription expires in ${daysRemaining} days`;
    
    let message = `
      <h2>Subscription Renewal Reminder</h2>
      <p>Dear ${user.name},</p>
      <p>Your Altaro Cloud Backup <strong>${user.subscription.plan.toUpperCase()}</strong> subscription will expire in <strong>${daysRemaining} days</strong>.</p>
      <p>Subscription details:</p>
      <ul>
        <li>Plan: ${user.subscription.plan.toUpperCase()}</li>
        <li>Expiry Date: ${user.subscription.expiryDate.toLocaleDateString()}</li>
        <li>Renewal Amount: $${renewal.amount.toFixed(2)}</li>
      </ul>
    `;
    
    if (user.subscription.autoRenew) {
      message += `
        <p>Your subscription is set to <strong>auto-renew</strong>. We'll automatically process your renewal using your saved payment method.</p>
        <p>If you want to change your plan or payment method, please log in to your account and update your subscription settings.</p>
      `;
    } else {
      message += `
        <p>To renew your subscription and avoid service interruption, please log in to your account and process your renewal.</p>
        <p><a href="${process.env.FRONTEND_URL}/renewals/${renewal._id}">Click here to renew your subscription</a></p>
      `;
    }
    
    message += `
      <p>Thank you for choosing Altaro Cloud Backup for your data protection needs.</p>
      <p>The Altaro Team</p>
    `;
    
    await sendEmail({
      email: user.email,
      subject,
      message
    });
    
    console.log(`Sent renewal notification email to ${user.email}`);
  } catch (error) {
    console.error(`Error sending renewal notification email to ${user.email}:`, error);
  }
};

/**
 * Process automatic renewal for a user
 * @param {Object} user - User document
 */
const processAutoRenewal = async (user) => {
  try {
    console.log(`Processing automatic renewal for user ${user._id}`);
    
    // Find pending renewal
    const renewal = await Renewal.findOne({
      user: user._id,
      status: 'pending'
    });
    
    if (!renewal) {
      console.warn(`No pending renewal found for user ${user._id}`);
      return;
    }
    
    // Update renewal status
    renewal.status = 'processing';
    await renewal.save();
    
    // Process payment (this would integrate with payment processor in production)
    const paymentSuccessful = await processPayment(user, renewal);
    
    if (paymentSuccessful) {
      // Update renewal
      renewal.status = 'paid';
      renewal.paymentDate = new Date();
      await renewal.save();
      
      // Update user subscription
      user.subscription.expiryDate = renewal.newExpiryDate;
      await user.save();
      
      // Send confirmation email
      await sendRenewalConfirmation(user, renewal);
      
      console.log(`Automatic renewal successful for user ${user._id}`);
    } else {
      // Update renewal status
      renewal.status = 'failed';
      await renewal.save();
      
      // Send failure notification
      await sendRenewalFailure(user, renewal);
      
      console.log(`Automatic renewal failed for user ${user._id}`);
    }
  } catch (error) {
    console.error(`Error processing automatic renewal for user ${user._id}:`, error);
  }
};

/**
 * Process payment for a renewal (mock implementation)
 * @param {Object} user - User document
 * @param {Object} renewal - Renewal document
 * @returns {Promise<boolean>} - True if payment successful
 */
const processPayment = async (user, renewal) => {
  // This is a mock implementation
  // In a real application, this would integrate with a payment processor
  
  // Simulate 90% success rate
  const success = Math.random() < 0.9;
  
  return new Promise(resolve => {
    // Simulate processing delay
    setTimeout(() => {
      resolve(success);
    }, 2000);
  });
};

/**
 * Send a renewal confirmation email
 * @param {Object} user - User document
 * @param {Object} renewal - Renewal document
 */
const sendRenewalConfirmation = async (user, renewal) => {
  try {
    const subject = 'Your Altaro Cloud Backup subscription has been renewed';
    
    const message = `
      <h2>Subscription Renewal Confirmation</h2>
      <p>Dear ${user.name},</p>
      <p>Your Altaro Cloud Backup <strong>${user.subscription.plan.toUpperCase()}</strong> subscription has been successfully renewed.</p>
      <p>Renewal details:</p>
      <ul>
        <li>Plan: ${user.subscription.plan.toUpperCase()}</li>
        <li>New Expiry Date: ${renewal.newExpiryDate.toLocaleDateString()}</li>
        <li>Amount Charged: $${renewal.amount.toFixed(2)}</li>
        <li>Payment Method: ${user.subscription.paymentMethod.replace('_', ' ')}</li>
      </ul>
      <p>Thank you for your continued trust in Altaro Cloud Backup.</p>
      <p>The Altaro Team</p>
    `;
    
    await sendEmail({
      email: user.email,
      subject,
      message
    });
    
    console.log(`Sent renewal confirmation email to ${user.email}`);
  } catch (error) {
    console.error(`Error sending renewal confirmation email to ${user.email}:`, error);
  }
};

/**
 * Send a renewal failure email
 * @param {Object} user - User document
 * @param {Object} renewal - Renewal document
 */
const sendRenewalFailure = async (user, renewal) => {
  try {
    const subject = 'Action Required: Your Altaro Cloud Backup subscription renewal failed';
    
    const message = `
      <h2>Subscription Renewal Failed</h2>
      <p>Dear ${user.name},</p>
      <p>We were unable to process the automatic renewal for your Altaro Cloud Backup <strong>${user.subscription.plan.toUpperCase()}</strong> subscription.</p>
      <p>This could be due to an expired credit card, insufficient funds, or other payment issues.</p>
      <p>Your subscription will expire on <strong>${user.subscription.expiryDate.toLocaleDateString()}</strong>. To avoid service interruption, please log in to your account and update your payment method or manually process your renewal.</p>
      <p><a href="${process.env.FRONTEND_URL}/renewals/${renewal._id}">Click here to complete your renewal</a></p>
      <p>If you need assistance, please contact our support team.</p>
      <p>The Altaro Team</p>
    `;
    
    await sendEmail({
      email: user.email,
      subject,
      message
    });
    
    console.log(`Sent renewal failure email to ${user.email}`);
  } catch (error) {
    console.error(`Error sending renewal failure email to ${user.email}:`, error);
  }
};

// Export for testing
exports.checkRenewals = checkRenewals;
