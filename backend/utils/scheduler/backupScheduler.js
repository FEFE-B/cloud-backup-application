const schedule = require('node-schedule');
const Backup = require('../../models/Backup');
const BackupHistory = require('../../models/BackupHistory');
const User = require('../../models/User');
const { executeBackup } = require('./backupExecutor');

let jobs = {};

/**
 * Initialize the backup scheduler
 */
exports.initScheduler = async () => {
  try {
    console.log('Initializing backup scheduler...');
    
    // Clear any existing scheduled jobs
    cancelAllJobs();
    
    // Get all active backups with a frequency other than manual
    const backups = await Backup.find({
      frequency: { $ne: 'manual' }
    }).populate({
      path: 'user',
      select: 'subscription.isActive'
    });
    
    console.log(`Found ${backups.length} scheduled backups`);
    
    // Schedule each backup
    backups.forEach(backup => {
      // Only schedule if user subscription is active
      if (backup.user && backup.user.subscription && backup.user.subscription.isActive) {
        scheduleBackup(backup);
      }
    });
    
    // Schedule daily check for new backups to schedule (runs at midnight)
    schedule.scheduleJob('0 0 * * *', refreshSchedule);
    
    console.log('Backup scheduler initialized successfully');
  } catch (error) {
    console.error('Error initializing backup scheduler:', error);
  }
};

/**
 * Schedule a single backup
 * @param {Object} backup - Backup configuration
 */
const scheduleBackup = (backup) => {
  if (!backup.nextRun) {
    console.warn(`Backup ${backup._id} has no nextRun date, skipping scheduling`);
    return;
  }
  
  const job = schedule.scheduleJob(backup._id.toString(), backup.nextRun, async () => {
    try {
      console.log(`Executing scheduled backup: ${backup.name} (${backup._id})`);
      
      // Create backup history entry
      const backupHistory = await BackupHistory.create({
        backup: backup._id,
        user: backup.user._id || backup.user,
        startTime: new Date(),
        status: 'in-progress',
        type: backup.type,
        cloudLocation: {
          service: backup.cloudLocation.service,
          bucketName: backup.cloudLocation.bucketName,
          path: `${backup.cloudLocation.path}/${new Date().toISOString().replace(/:/g, '-')}`
        }
      });
      
      // Update backup status
      backup.status = 'in-progress';
      backup.lastRun = new Date();
      await backup.save();
      
      // Execute the backup
      await executeBackup(backup, backupHistory);
      
      // Reschedule the backup for the next period
      const nextRun = calculateNextRun(backup.frequency);
      
      // Update backup with new next run date
      await Backup.findByIdAndUpdate(backup._id, {
        nextRun
      });
      
      // Schedule the next run
      scheduleBackup({
        ...backup.toObject(),
        nextRun
      });
      
      console.log(`Scheduled next backup: ${backup.name} for ${nextRun}`);
    } catch (error) {
      console.error(`Error executing scheduled backup ${backup._id}:`, error);
    }
  });
  
  // Store the job for future reference
  jobs[backup._id.toString()] = job;
  
  console.log(`Scheduled backup: ${backup.name} (${backup._id}) for ${backup.nextRun}`);
};

/**
 * Calculate the next run date based on frequency
 * @param {string} frequency - Backup frequency (daily, weekly, monthly)
 * @returns {Date} - Next run date
 */
const calculateNextRun = (frequency) => {
  const nextRun = new Date();
  
  switch (frequency) {
    case 'daily':
      nextRun.setDate(nextRun.getDate() + 1);
      break;
    case 'weekly':
      nextRun.setDate(nextRun.getDate() + 7);
      break;
    case 'monthly':
      nextRun.setMonth(nextRun.getMonth() + 1);
      break;
  }
  
  return nextRun;
};

/**
 * Refresh the schedule by checking for new or updated backups
 */
const refreshSchedule = async () => {
  try {
    console.log('Refreshing backup schedule...');
    
    // Get all active backups with a frequency other than manual
    const backups = await Backup.find({
      frequency: { $ne: 'manual' }
    }).populate({
      path: 'user',
      select: 'subscription.isActive'
    });
    
    // Get existing job IDs
    const existingJobIds = Object.keys(jobs);
    
    // Find new or updated backups to schedule
    backups.forEach(backup => {
      const backupId = backup._id.toString();
      const existingJob = jobs[backupId];
      
      // Skip if user subscription is not active
      if (!backup.user || !backup.user.subscription || !backup.user.subscription.isActive) {
        if (existingJob) {
          // Cancel job if subscription is no longer active
          existingJob.cancel();
          delete jobs[backupId];
          console.log(`Cancelled job for backup ${backupId} due to inactive subscription`);
        }
        return;
      }
      
      if (!existingJob && backup.nextRun) {
        // New backup to schedule
        scheduleBackup(backup);
      } else if (existingJob && backup.nextRun) {
        // Check if next run date has changed
        const currentNextRun = existingJob.nextInvocation().getTime();
        const newNextRun = new Date(backup.nextRun).getTime();
        
        if (currentNextRun !== newNextRun) {
          // Reschedule with updated next run date
          existingJob.cancel();
          delete jobs[backupId];
          scheduleBackup(backup);
        }
      }
    });
    
    // Find and cancel jobs for deleted backups
    const activeBackupIds = backups.map(backup => backup._id.toString());
    existingJobIds.forEach(jobId => {
      if (!activeBackupIds.includes(jobId)) {
        const job = jobs[jobId];
        if (job) {
          job.cancel();
          delete jobs[jobId];
          console.log(`Cancelled job for deleted backup ${jobId}`);
        }
      }
    });
    
    console.log('Backup schedule refreshed successfully');
  } catch (error) {
    console.error('Error refreshing backup schedule:', error);
  }
};

/**
 * Cancel all scheduled jobs
 */
const cancelAllJobs = () => {
  Object.values(jobs).forEach(job => job.cancel());
  jobs = {};
  console.log('All scheduled backup jobs cancelled');
};

/**
 * Schedule a specific backup by ID
 * @param {string} backupId - Backup ID
 */
exports.scheduleBackupById = async (backupId) => {
  try {
    // Cancel existing job if any
    if (jobs[backupId]) {
      jobs[backupId].cancel();
      delete jobs[backupId];
    }
    
    // Get backup with user info
    const backup = await Backup.findById(backupId).populate({
      path: 'user',
      select: 'subscription.isActive'
    });
    
    if (!backup) {
      console.warn(`Backup ${backupId} not found, cannot schedule`);
      return false;
    }
    
    // Only schedule if frequency is not manual and user subscription is active
    if (backup.frequency !== 'manual' && 
        backup.user && 
        backup.user.subscription && 
        backup.user.subscription.isActive) {
      scheduleBackup(backup);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error scheduling backup ${backupId}:`, error);
    return false;
  }
};

/**
 * Cancel a scheduled backup by ID
 * @param {string} backupId - Backup ID
 */
exports.cancelScheduledBackup = (backupId) => {
  try {
    const job = jobs[backupId];
    if (job) {
      job.cancel();
      delete jobs[backupId];
      console.log(`Cancelled scheduled backup ${backupId}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error cancelling scheduled backup ${backupId}:`, error);
    return false;
  }
};
