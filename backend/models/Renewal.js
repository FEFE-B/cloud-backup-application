const mongoose = require('mongoose');

const RenewalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subscriptionPlan: {
    type: String,
    required: true,
    enum: ['free', 'basic', 'premium', 'enterprise']
  },
  currentExpiryDate: {
    type: Date,
    required: true
  },
  newExpiryDate: {
    type: Date,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  discount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'canceled', 'failed'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'paypal', 'bank_transfer', 'none'],
    default: 'none'
  },
  paymentDate: {
    type: Date
  },
  invoiceNumber: {
    type: String
  },
  invoiceUrl: {
    type: String
  },
  notificationsSent: [{
    type: String,
    enum: ['30-day', '15-day', '7-day', '1-day', 'expired'],
  }],
  notes: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
RenewalSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Renewal', RenewalSchema);
