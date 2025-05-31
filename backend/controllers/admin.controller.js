const User = require('../models/User');
const Backup = require('../models/Backup');
const BackupHistory = require('../models/BackupHistory');
const Renewal = require('../models/Renewal');
const ActivityLog = require('../models/ActivityLog');

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin)
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
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

// @desc    Get all users with filtering and pagination for admin list view
// @route   GET /api/admin/users/list
// @access  Private (Admin)
exports.getUsersList = async (req, res) => {
  try {
    const { 
      search, 
      status,
      plan,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10
    } = req.query;
    
    // Build query
    const query = {};
    
    // Filter by subscription status
    if (status) {
      if (status === 'active') {
        query['subscription.isActive'] = true;
      } else if (status === 'inactive') {
        query['subscription.isActive'] = false;
      }
    }
    
    // Filter by subscription plan
    if (plan) {
      query['subscription.plan'] = plan;
    }
    
    // Search by name, email, or company
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Set up pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Set up sort
    const sort = {};
    
    // Handle special sort cases
    if (sortBy === 'subscription.plan') {
      sort['subscription.plan'] = sortOrder === 'asc' ? 1 : -1;
    } else if (sortBy === 'subscription.expiryDate') {
      sort['subscription.expiryDate'] = sortOrder === 'asc' ? 1 : -1;
    } else {
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    }
    
    // Execute query with pagination
    const users = await User.find(query)
      .select('-password')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const total = await User.countDocuments(query);
    
    res.status(200).json({
      success: true,
      data: users,
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

// @desc    Get a single user
// @route   GET /api/admin/users/:id
// @access  Private (Admin)
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
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

// @desc    Update a user
// @route   PUT /api/admin/users/:id
// @access  Private (Admin)
exports.updateUser = async (req, res) => {
  try {
    // Check if user exists
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).select('-password');

    // Log activity
    await ActivityLog.create({
      user: req.params.id,
      action: 'user_updated',
      performedBy: req.user.id,
      details: `User profile updated by admin`
    });

    res.status(200).json({
      success: true,
      data: updatedUser
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

// @desc    Delete a user
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete user's backups
    const backups = await Backup.find({ user: req.params.id });
    for (const backup of backups) {
      // Delete backup histories
      await BackupHistory.deleteMany({ backup: backup._id });
      
      // Delete backup
      await backup.remove();
    }

    // Delete user's renewals
    await Renewal.deleteMany({ user: req.params.id });

    // Delete user's activity logs
    await ActivityLog.deleteMany({ user: req.params.id });

    // Delete user
    await user.remove();

    res.status(200).json({
      success: true,
      data: {}
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

// @desc    Get user backups
// @route   GET /api/admin/users/:id/backups
// @access  Private (Admin)
exports.getUserBackups = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const backups = await Backup.find({ user: req.params.id })
      .sort({ lastBackupDate: -1 });
    
    res.status(200).json({
      success: true,
      count: backups.length,
      data: backups
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

// @desc    Get user renewals
// @route   GET /api/admin/users/:id/renewals
// @access  Private (Admin)
exports.getUserRenewals = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const renewals = await Renewal.find({ user: req.params.id })
      .sort({ dueDate: -1 });
    
    res.status(200).json({
      success: true,
      count: renewals.length,
      data: renewals
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

// @desc    Get user activity history
// @route   GET /api/admin/users/:id/history
// @access  Private (Admin)
exports.getUserHistory = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const history = await ActivityLog.find({ user: req.params.id })
      .sort({ timestamp: -1 })
      .limit(100); // Limit to last 100 activities
    
    res.status(200).json({
      success: true,
      count: history.length,
      data: history
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

// @desc    Update user subscription status
// @route   PUT /api/admin/users/:id/status
// @access  Private (Admin)
exports.updateUserStatus = async (req, res) => {
  try {
    const { status, reason } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Update subscription status
    user.subscription.isActive = status === 'active';
    
    // If setting to inactive, record reason
    if (status === 'inactive' && reason) {
      await ActivityLog.create({
        user: req.params.id,
        action: 'subscription_deactivated',
        performedBy: req.user.id,
        details: `Subscription deactivated by admin. Reason: ${reason}`
      });
    } else if (status === 'active') {
      await ActivityLog.create({
        user: req.params.id,
        action: 'subscription_activated',
        performedBy: req.user.id,
        details: `Subscription activated by admin`
      });
    }
    
    await user.save();
    
    res.status(200).json({
      success: true,
      data: user
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

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private (Admin)
exports.getDashboardStats = async (req, res) => {
  try {
    // Get user count
    const userCount = await User.countDocuments();
    
    // Get active subscriptions count
    const activeSubscriptions = await User.countDocuments({
      'subscription.isActive': true
    });
    
    // Get backups count
    const backupCount = await Backup.countDocuments();
    
    // Get renewals stats
    const pendingRenewals = await Renewal.countDocuments({ status: 'pending' });
    const completedRenewals = await Renewal.countDocuments({ status: 'paid' });
    
    // Get revenue (sum of paid renewals)
    const revenueResult = await Renewal.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$price' } } }
    ]);
    const revenue = revenueResult.length > 0 ? revenueResult[0].total : 0;
    
    // Get backup storage used
    const storageResult = await Backup.aggregate([
      { $group: { _id: null, total: { $sum: '$size' } } }
    ]);
    const storageUsed = storageResult.length > 0 ? storageResult[0].total : 0;
    
    // Get recent renewals
    const recentRenewals = await Renewal.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'name email');
    
    // Get expiring subscriptions in next 30 days
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const expiringSubscriptions = await User.find({
      'subscription.isActive': true,
      'subscription.expiryDate': {
        $gte: new Date(),
        $lte: thirtyDaysFromNow
      }
    }).select('name email subscription.expiryDate');
    
    res.status(200).json({
      success: true,
      data: {
        userCount,
        activeSubscriptions,
        backupCount,
        pendingRenewals,
        completedRenewals,
        revenue,
        storageUsed,
        recentRenewals,
        expiringSubscriptions
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

// @desc    Get recent users for dashboard
// @route   GET /api/admin/users/recent
// @access  Private (Admin)
exports.getRecentUsers = async (req, res) => {
  try {
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('name email company createdAt subscription.plan');
    
    res.status(200).json({
      success: true,
      count: recentUsers.length,
      data: recentUsers
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

// @desc    Get recent backups for dashboard
// @route   GET /api/admin/backups/recent
// @access  Private (Admin)
exports.getRecentBackups = async (req, res) => {
  try {
    const recentBackups = await Backup.find()
      .sort({ lastBackupDate: -1 })
      .limit(10)
      .populate('user', 'name email');
    
    res.status(200).json({
      success: true,
      count: recentBackups.length,
      data: recentBackups
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

// @desc    Get chart data for dashboard
// @route   GET /api/admin/charts
// @access  Private (Admin)
exports.getChartData = async (req, res) => {
  try {
    // Get user sign-ups by month (last 12 months)
    const userSignups = await User.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(new Date().setMonth(new Date().getMonth() - 11))
          }
        }
      },
      {
        $group: {
          _id: { 
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);
    
    // Format user signups data for chart
    const userSignupsData = formatChartData(userSignups);
    
    // Get renewals by month (last 12 months)
    const renewalsByMonth = await Renewal.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(new Date().setMonth(new Date().getMonth() - 11))
          }
        }
      },
      {
        $group: {
          _id: { 
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            status: "$status"
          },
          count: { $sum: 1 },
          revenue: { $sum: "$price" }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);
    
    // Format renewals data for chart
    const renewalsData = formatRenewalsChartData(renewalsByMonth);
    
    // Get storage usage by plan
    const storageByPlan = await Backup.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      { $unwind: "$userInfo" },
      {
        $group: {
          _id: "$userInfo.subscription.plan",
          totalStorage: { $sum: "$size" }
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        userSignups: userSignupsData,
        renewals: renewalsData,
        storageByPlan
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

// Helper function to format chart data
const formatChartData = (data) => {
  const months = [];
  const counts = [];
  
  // Get current month and year
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  // Create an array of the last 12 months
  for (let i = 0; i < 12; i++) {
    const monthIndex = (currentMonth - i + 12) % 12;
    const year = currentYear - Math.floor((i - currentMonth) / 12);
    months.unshift(`${getMonthName(monthIndex)} ${year}`);
    
    // Find the corresponding count from the data
    const monthData = data.find(
      item => item._id.month === monthIndex + 1 && item._id.year === year
    );
    
    counts.unshift(monthData ? monthData.count : 0);
  }
  
  return { months, counts };
};

// Helper function to format renewals chart data
const formatRenewalsChartData = (data) => {
  const months = [];
  const paid = [];
  const pending = [];
  const revenue = [];
  
  // Get current month and year
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  // Create an array of the last 12 months
  for (let i = 0; i < 12; i++) {
    const monthIndex = (currentMonth - i + 12) % 12;
    const year = currentYear - Math.floor((i - currentMonth) / 12);
    months.unshift(`${getMonthName(monthIndex)} ${year}`);
    
    // Find the corresponding counts from the data
    const paidData = data.find(
      item => item._id.month === monthIndex + 1 && 
              item._id.year === year && 
              item._id.status === 'paid'
    );
    
    const pendingData = data.find(
      item => item._id.month === monthIndex + 1 && 
              item._id.year === year && 
              item._id.status === 'pending'
    );
    
    paid.unshift(paidData ? paidData.count : 0);
    pending.unshift(pendingData ? pendingData.count : 0);
    revenue.unshift(paidData ? paidData.revenue : 0);
  }
  
  return { months, paid, pending, revenue };
};

// Helper function to get month name
const getMonthName = (monthIndex) => {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  return months[monthIndex];
};
