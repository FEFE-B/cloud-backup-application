const mongoose = require('mongoose');

const BackupSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Please provide a backup name'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  sourceDirectory: {
    type: String,
    required: [true, 'Please specify the source directory']
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'failed'],
    default: 'pending'
  },
  type: {
    type: String,
    enum: ['full', 'incremental', 'differential'],
    default: 'full'
  },
  frequency: {
    type: String,
    enum: ['manual', 'daily', 'weekly', 'monthly'],
    default: 'manual'
  },
  retention: {
    days: {
      type: Number,
      default: 30
    }
  },
  size: {
    type: Number, // Size in bytes
    default: 0
  },
  cloudLocation: {
    service: {
      type: String,
      enum: ['aws', 'azure', 'gcp', 'local'],
      default: 'aws'
    },
    path: String,
    bucketName: String
  },
  encryptionEnabled: {
    type: Boolean,
    default: true
  },
  compressionEnabled: {
    type: Boolean,
    default: true
  },
  lastRun: {
    type: Date
  },
  nextRun: {
    type: Date
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
BackupSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Backup', BackupSchema);
