const mongoose = require('mongoose');
const cron = require('node-cron');
const backupScheduler = require('../../../utils/scheduler/backupScheduler');
const backupExecutor = require('../../../utils/scheduler/backupExecutor');
const Backup = require('../../../models/Backup');

// Mock dependencies
jest.mock('node-cron', () => ({
  schedule: jest.fn().mockReturnValue({
    start: jest.fn(),
    stop: jest.fn()
  })
}));

jest.mock('../../../utils/scheduler/backupExecutor', () => ({
  executeBackup: jest.fn().mockResolvedValue({
    status: 'success',
    size: 1024,
    message: 'Backup completed successfully'
  })
}));

describe('Backup Scheduler Tests', () => {
  let mockBackups;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock backups
    mockBackups = [
      {
        _id: new mongoose.Types.ObjectId(),
        name: 'Daily Backup',
        user: new mongoose.Types.ObjectId(),
        status: 'active',
        backupType: 'file',
        schedule: {
          enabled: true,
          frequency: 'daily',
          time: '03:00'
        },
        lastRun: new Date(Date.now() - 24 * 60 * 60 * 1000),
        nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000)
      },
      {
        _id: new mongoose.Types.ObjectId(),
        name: 'Weekly Backup',
        user: new mongoose.Types.ObjectId(),
        status: 'active',
        backupType: 'database',
        schedule: {
          enabled: true,
          frequency: 'weekly',
          day: 'Sunday',
          time: '02:00'
        },
        lastRun: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        nextRun: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      },
      {
        _id: new mongoose.Types.ObjectId(),
        name: 'Paused Backup',
        user: new mongoose.Types.ObjectId(),
        status: 'paused',
        backupType: 'file',
        schedule: {
          enabled: false,
          frequency: 'daily',
          time: '01:00'
        },
        lastRun: null,
        nextRun: null
      }
    ];
    
    // Mock database queries
    Backup.find = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockBackups.filter(b => b.status === 'active' && b.schedule.enabled))
    });
  });

  describe('initializeScheduler', () => {
    it('should initialize scheduler and create cron jobs for active backups', async () => {
      await backupScheduler.initializeScheduler();
      
      // Should find active backups with enabled schedules
      expect(Backup.find).toHaveBeenCalledWith({
        status: 'active',
        'schedule.enabled': true
      });
      
      // Should create cron jobs for each active backup (2 in our mocks)
      expect(cron.schedule).toHaveBeenCalledTimes(2);
      
      // Should create a daily cron job for first backup
      expect(cron.schedule.mock.calls[0][0]).toBe('0 3 * * *');
      
      // Should create a weekly cron job for second backup
      expect(cron.schedule.mock.calls[1][0]).toBe('0 2 * * 0');
    });
    
    it('should not create cron jobs for paused or disabled backups', async () => {
      // Include the paused backup in the results
      Backup.find = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockBackups)
      });
      
      await backupScheduler.initializeScheduler();
      
      // Should still only create 2 cron jobs (for active+enabled backups)
      expect(cron.schedule).toHaveBeenCalledTimes(2);
    });
  });

  describe('scheduleBackup', () => {
    it('should create appropriate cron expression for daily backup', () => {
      const backup = mockBackups[0]; // Daily backup at 03:00
      
      backupScheduler.scheduleBackup(backup);
      
      expect(cron.schedule).toHaveBeenCalledWith(
        '0 3 * * *', 
        expect.any(Function),
        expect.any(Object)
      );
    });
    
    it('should create appropriate cron expression for weekly backup', () => {
      const backup = mockBackups[1]; // Weekly backup on Sunday at 02:00
      
      backupScheduler.scheduleBackup(backup);
      
      expect(cron.schedule).toHaveBeenCalledWith(
        '0 2 * * 0', 
        expect.any(Function),
        expect.any(Object)
      );
    });
    
    it('should create appropriate cron expression for monthly backup', () => {
      const backup = {
        ...mockBackups[0],
        schedule: {
          enabled: true,
          frequency: 'monthly',
          day: '1', // 1st day of month
          time: '01:00'
        }
      };
      
      backupScheduler.scheduleBackup(backup);
      
      expect(cron.schedule).toHaveBeenCalledWith(
        '0 1 1 * *', 
        expect.any(Function),
        expect.any(Object)
      );
    });
    
    it('should execute backup when cron job fires', async () => {
      const backup = mockBackups[0];
      
      // Capture the callback function passed to cron.schedule
      let cronCallback;
      cron.schedule.mockImplementation((expression, callback) => {
        cronCallback = callback;
        return { start: jest.fn(), stop: jest.fn() };
      });
      
      backupScheduler.scheduleBackup(backup);
      
      // Simulate the cron job firing
      await cronCallback();
      
      // Should execute the backup
      expect(backupExecutor.executeBackup).toHaveBeenCalledWith(backup);
    });
  });

  describe('rescheduleBackup', () => {
    it('should stop existing job and create a new one when backup schedule changes', () => {
      const backup = mockBackups[0];
      const mockCronJob = { start: jest.fn(), stop: jest.fn() };
      
      // Mock the job being in the jobs map
      backupScheduler.jobs = new Map();
      backupScheduler.jobs.set(backup._id.toString(), mockCronJob);
      
      // Schedule with updated settings
      const updatedBackup = {
        ...backup,
        schedule: {
          enabled: true,
          frequency: 'daily',
          time: '04:00' // Changed from 03:00 to 04:00
        }
      };
      
      backupScheduler.rescheduleBackup(updatedBackup);
      
      // Should stop the existing job
      expect(mockCronJob.stop).toHaveBeenCalled();
      
      // Should create a new job with updated schedule
      expect(cron.schedule).toHaveBeenCalledWith(
        '0 4 * * *', 
        expect.any(Function),
        expect.any(Object)
      );
    });
    
    it('should remove job when backup is paused or schedule disabled', () => {
      const backup = mockBackups[0];
      const mockCronJob = { start: jest.fn(), stop: jest.fn() };
      
      // Mock the job being in the jobs map
      backupScheduler.jobs = new Map();
      backupScheduler.jobs.set(backup._id.toString(), mockCronJob);
      
      // Update to paused status
      const pausedBackup = {
        ...backup,
        status: 'paused'
      };
      
      backupScheduler.rescheduleBackup(pausedBackup);
      
      // Should stop the existing job
      expect(mockCronJob.stop).toHaveBeenCalled();
      
      // Should remove the job from the jobs map
      expect(backupScheduler.jobs.has(backup._id.toString())).toBe(false);
      
      // Should not create a new job
      expect(cron.schedule).not.toHaveBeenCalled();
    });
  });

  describe('getCronExpression', () => {
    it('should generate correct cron expression for daily backup', () => {
      const schedule = {
        frequency: 'daily',
        time: '03:00'
      };
      
      const expression = backupScheduler.getCronExpression(schedule);
      expect(expression).toBe('0 3 * * *');
    });
    
    it('should generate correct cron expression for weekly backup', () => {
      const schedule = {
        frequency: 'weekly',
        day: 'Monday',
        time: '02:00'
      };
      
      const expression = backupScheduler.getCronExpression(schedule);
      expect(expression).toBe('0 2 * * 1');
    });
    
    it('should generate correct cron expression for monthly backup', () => {
      const schedule = {
        frequency: 'monthly',
        day: '15', // 15th day of month
        time: '01:00'
      };
      
      const expression = backupScheduler.getCronExpression(schedule);
      expect(expression).toBe('0 1 15 * *');
    });
    
    it('should handle different time formats', () => {
      const schedule = {
        frequency: 'daily',
        time: '23:30'
      };
      
      const expression = backupScheduler.getCronExpression(schedule);
      expect(expression).toBe('30 23 * * *');
    });
  });
});
