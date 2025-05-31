const Backup = require('../models/Backup');
const BackupHistory = require('../models/BackupHistory');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const backupExecutor = require('../utils/scheduler/backupExecutor');

// @desc    Get all backups with filtering and pagination
// @route   GET /api/admin/backups
// @access  Private (Admin)
exports.getBackups = async (req, res) => {
  try {
    const { 
      search,
      status,
      type,
      userId,
      plan,
      sortBy = 'lastBackupDate',
      sortOrder = 'desc',
      page = 1,
      limit = 10
    } = req.query;
    
    const query = {};
    
    // Add filters
    if (status) query.status = status;
    if (type) query.backupType = type;
    if (userId) query.user = userId;
    
    // If search query is provided, search by name, user's name/email, or ID
    if (search) {
      // First, find users matching the search query
      const users = await User.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { company: { $regex: search, $options: 'i' } }
        ]
      });
      
      const userIds = users.map(user => user._id);
      
      // Update query to include user IDs and backup name/ID search
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { user: { $in: userIds } },
        { _id: search.match(/^[0-9a-fA-F]{24}$/) ? search : null }
      ];
    }
    
    // Filter by plan - requires aggregation if plan is specified
    if (plan) {
      // This requires an aggregation pipeline instead of a simple find
      const backups = await Backup.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'userInfo'
          }
        },
        { $unwind: '$userInfo' },
        {
          $match: {
            'userInfo.subscription.plan': plan,
            ...query
          }
        },
        { $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 } },
        { $skip: (parseInt(page) - 1) * parseInt(limit) },
        { $limit: parseInt(limit) }
      ]);

      // Get total count for pagination with the same filter
      const totalCount = await Backup.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'userInfo'
          }
        },
        { $unwind: '$userInfo' },
        {
          $match: {
            'userInfo.subscription.plan': plan,
            ...query
          }
        },
        { $count: 'total' }
      ]);

      const total = totalCount.length > 0 ? totalCount[0].total : 0;

      // Populate user information manually as aggregation doesn't support populate
      const populatedBackups = await User.populate(backups, {
        path: 'user',
        select: 'name email company subscription'
      });

      return res.status(200).json({
        success: true,
        data: populatedBackups,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      });
    }
    
    // Set up pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Set up sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // Execute query with pagination and populate user data
    const backups = await Backup.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', 'name email company subscription');
    
    // Get total count for pagination
    const total = await Backup.countDocuments(query);
    
    res.status(200).json({
      success: true,
      data: backups,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get backup summary statistics
// @route   GET /api/admin/backups/summary
// @access  Private (Admin)
exports.getBackupsSummary = async (req, res) => {
  try {
    // Get total count of backups
    const totalBackups = await Backup.countDocuments();
    
    // Get count of active backups
    const activeBackups = await Backup.countDocuments({ status: 'active' });
    
    // Get count of failed backups
    const failedBackups = await Backup.countDocuments({ status: 'failed' });
    
    // Get count of pending backups
    const pendingBackups = await Backup.countDocuments({ status: 'pending' });
    
    // Get count of scheduled backups
    const scheduledBackups = await Backup.countDocuments({ 
      'schedule.enabled': true 
    });
    
    // Get total storage used
    const storageResult = await Backup.aggregate([
      { $group: { _id: null, total: { $sum: '$size' } } }
    ]);
    const totalStorage = storageResult.length > 0 ? storageResult[0].total : 0;
    
    // Get storage by plan
    const storageByPlan = await Backup.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      { $unwind: '$userInfo' },
      {
        $group: {
          _id: '$userInfo.subscription.plan',
          count: { $sum: 1 },
          storage: { $sum: '$size' }
        }
      }
    ]);
    
    // Get latest backup activity
    const recentActivity = await BackupHistory.find()
      .sort({ timestamp: -1 })
      .limit(10)
      .populate({
        path: 'backup',
        populate: { path: 'user', select: 'name email' }
      });
    
    // Get backup count by status
    const backupsByStatus = [
      { status: 'active', count: activeBackups },
      { status: 'failed', count: failedBackups },
      { status: 'pending', count: pendingBackups },
      { status: 'running', count: await Backup.countDocuments({ status: 'running' }) },
      { status: 'paused', count: await Backup.countDocuments({ status: 'paused' }) }
    ];
    
    // Get backups by file type
    const backupsByType = await Backup.aggregate([
      {
        $group: {
          _id: '$backupType',
          count: { $sum: 1 },
          storage: { $sum: '$size' }
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        totalBackups,
        activeBackups,
        failedBackups,
        pendingBackups,
        scheduledBackups,
        totalStorage,
        storageByPlan,
        recentActivity,
        backupsByStatus,
        backupsByType,
        storageUsed: totalStorage
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Run a backup manually
// @route   POST /api/admin/backups/:id/run
// @access  Private (Admin)
exports.runBackup = async (req, res) => {
  try {
    // Find backup by ID
    const backup = await Backup.findById(req.params.id);
    
    if (!backup) {
      return res.status(404).json({
        success: false,
        message: 'Backup not found'
      });
    }
    
    // Check if backup is already running
    if (backup.status === 'running') {
      return res.status(400).json({
        success: false,
        message: 'Backup is already running'
      });
    }
    
    // Update status to running
    backup.status = 'running';
    backup.lastBackupTrigger = new Date();
    await backup.save();
    
    // Log the activity
    await ActivityLog.create({
      user: backup.user,
      action: 'backup_triggered',
      performedBy: req.user.id,
      details: `Manual backup initiated by admin for backup: ${backup.name}`
    });
    
    // Execute backup in background
    backupExecutor.executeBackup(backup._id)
      .then(async () => {
        console.log(`Backup ${backup._id} completed successfully`);
        
        // Log successful completion
        await ActivityLog.create({
          user: backup.user,
          action: 'backup_completed',
          performedBy: req.user.id,
          details: `Manual backup completed successfully for: ${backup.name}`
        });
      })
      .catch(async (err) => {
        console.error(`Backup ${backup._id} failed:`, err);
        
        // Update backup status to failed
        const failedBackup = await Backup.findById(backup._id);
        if (failedBackup) {
          failedBackup.status = 'failed';
          failedBackup.lastBackupStatus = 'failed';
          await failedBackup.save();
        }
        
        // Log failure
        await ActivityLog.create({
          user: backup.user,
          action: 'backup_failed',
          performedBy: req.user.id,
          details: `Manual backup failed for: ${backup.name}. Error: ${err.message}`
        });
      });
    
    res.status(200).json({
      success: true,
      message: 'Backup started successfully',
      data: backup
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update backup status
// @route   PUT /api/admin/backups/:id/status
// @access  Private (Admin)
exports.updateBackupStatus = async (req, res) => {
  try {
    const { status, reason } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }
    
    // Validate status
    const validStatuses = ['active', 'paused', 'failed', 'pending', 'inactive'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }
    
    // Find backup by ID
    const backup = await Backup.findById(req.params.id);
    
    if (!backup) {
      return res.status(404).json({
        success: false,
        message: 'Backup not found'
      });
    }
    
    // Don't allow changing status if backup is currently running
    if (backup.status === 'running') {
      return res.status(400).json({
        success: false,
        message: 'Cannot change status while backup is running'
      });
    }
    
    // Update status
    backup.status = status;
    backup.lastUpdated = new Date();
    
    if (status === 'active') {
      backup.lastBackupStatus = 'success';
    } else if (status === 'failed') {
      backup.lastBackupStatus = 'failed';
    }
    
    // Save the backup
    await backup.save();
    
    // Log the status change
    await ActivityLog.create({
      user: backup.user,
      action: 'backup_status_changed',
      performedBy: req.user.id,
      details: `Backup status changed to ${status} by admin${reason ? `. Reason: ${reason}` : ''}`
    });
    
    // Create backup history entry
    await BackupHistory.create({
      backup: backup._id,
      status: status,
      timestamp: new Date(),
      details: `Status changed to ${status} by admin${reason ? `. Reason: ${reason}` : ''}`
    });
    
    res.status(200).json({
      success: true,
      data: backup
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
