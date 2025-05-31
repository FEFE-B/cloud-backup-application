const mongoose = require('mongoose');

const BackupHistorySchema = new mongoose.Schema({
  backup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Backup',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date
  },
  status: {
    type: String,
    enum: ['in-progress', 'completed', 'failed'],
    default: 'in-progress'
  },
  size: {
    type: Number, // Size in bytes
    default: 0
  },
  filesCount: {
    type: Number,
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
  error: {
    message: String,
    stack: String
  },
  type: {
    type: String,
    enum: ['full', 'incremental', 'differential'],
    default: 'full'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('BackupHistory', BackupHistorySchema);
