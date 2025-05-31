const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      // User related actions
      'user_created',
      'user_updated',
      'user_deleted',
      'user_login',
      'user_logout',
      'password_changed',
      'password_reset_requested',
      
      // Subscription related actions
      'subscription_created',
      'subscription_updated',
      'subscription_activated',
      'subscription_deactivated',
      'subscription_renewed',
      
      // Backup related actions
      'backup_created',
      'backup_updated',
      'backup_deleted',
      'backup_triggered',
      'backup_completed',
      'backup_failed',
      'backup_status_changed',
      
      // Renewal related actions
      'renewal_created',
      'renewal_updated',
      'renewal_paid',
      'renewal_payment_failed',
      'renewal_reminder_sent'
    ]
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  details: {
    type: String
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
});

// Index for quicker lookups by user and timestamp
ActivityLogSchema.index({ user: 1, timestamp: -1 });
ActivityLogSchema.index({ action: 1, timestamp: -1 });

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);
