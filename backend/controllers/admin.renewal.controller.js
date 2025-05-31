const Renewal = require('../models/Renewal');
const User = require('../models/User');
const emailService = require('../utils/auth/emailService');

// @desc    Get all renewals with filtering and pagination
// @route   GET /api/admin/renewals
// @access  Private (Admin)
exports.getRenewals = async (req, res) => {
  try {
    const { 
      search,
      status,
      plan,
      dateRange,
      sortBy = 'dueDate',
      sortOrder = 'asc',
      page = 1,
      limit = 10
    } = req.query;
    
    const query = {};
    
    // Add filters
    if (status) query.status = status;
    if (plan) query.plan = plan;
    
    // Date range filter
    if (dateRange) {
      const now = new Date();
      let dateFilter = {};
      
      switch (dateRange) {
        case '7days':
          dateFilter = {
            $gte: new Date(now.setDate(now.getDate() - 7))
          };
          break;
        case '30days':
          dateFilter = {
            $gte: new Date(now.setDate(now.getDate() - 30))
          };
          break;
        case '90days':
          dateFilter = {
            $gte: new Date(now.setDate(now.getDate() - 90))
          };
          break;
        case 'thisYear':
          dateFilter = {
            $gte: new Date(now.getFullYear(), 0, 1)
          };
          break;
        default:
          break;
      }
      
      if (Object.keys(dateFilter).length > 0) {
        query.dueDate = dateFilter;
      }
    }
    
    // If search query is provided, search by user name, email, or renewal ID
    if (search) {
      // First, find users matching the search
      const users = await User.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      });
      
      const userIds = users.map(user => user._id);
      
      // Update query to include user IDs and renewal ID search
      query.$or = [
        { user: { $in: userIds } },
        { _id: search.match(/^[0-9a-fA-F]{24}$/) ? search : null }
      ];
    }
    
    // Set up pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Set up sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // Execute query with pagination and populate user data
    const renewals = await Renewal.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', 'name email');
    
    // Get total count for pagination
    const total = await Renewal.countDocuments(query);
    
    res.status(200).json({
      success: true,
      data: renewals,
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

// @desc    Get renewal summary statistics
// @route   GET /api/admin/renewals/summary
// @access  Private (Admin)
exports.getRenewalsSummary = async (req, res) => {
  try {
    // Get total count of renewals
    const total = await Renewal.countDocuments();
    
    // Get count of pending renewals
    const pending = await Renewal.countDocuments({ status: 'pending' });
    
    // Get count of paid renewals
    const paid = await Renewal.countDocuments({ status: 'paid' });
    
    // Get count of overdue renewals
    const overdue = await Renewal.countDocuments({ status: 'overdue' });
    
    // Get revenue stats
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfPrevMonth = new Date(firstDayOfMonth);
    lastDayOfPrevMonth.setDate(lastDayOfPrevMonth.getDate() - 1);
    const firstDayOfPrevMonth = new Date(lastDayOfPrevMonth.getFullYear(), lastDayOfPrevMonth.getMonth(), 1);
    
    // Revenue this month
    const thisMonthRevenue = await Renewal.aggregate([
      { 
        $match: { 
          status: 'paid',
          updatedAt: { $gte: firstDayOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);
    
    // Revenue last month
    const lastMonthRevenue = await Renewal.aggregate([
      { 
        $match: { 
          status: 'paid',
          updatedAt: { 
            $gte: firstDayOfPrevMonth,
            $lt: firstDayOfMonth
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);
    
    // Total revenue
    const totalRevenue = await Renewal.aggregate([
      { 
        $match: { 
          status: 'paid'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        total,
        pending,
        paid,
        overdue,
        revenue: {
          thisMonth: thisMonthRevenue.length > 0 ? thisMonthRevenue[0].total : 0,
          lastMonth: lastMonthRevenue.length > 0 ? lastMonthRevenue[0].total : 0,
          total: totalRevenue.length > 0 ? totalRevenue[0].total : 0
        }
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

// @desc    Get single renewal details
// @route   GET /api/admin/renewals/:id
// @access  Private (Admin)
exports.getRenewalDetails = async (req, res) => {
  try {
    const renewal = await Renewal.findById(req.params.id)
      .populate('user', 'name email status createdAt company phone');
    
    if (!renewal) {
      return res.status(404).json({
        success: false,
        message: 'Renewal not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: renewal
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

// @desc    Update renewal
// @route   PUT /api/admin/renewals/:id
// @access  Private (Admin)
exports.updateRenewal = async (req, res) => {
  try {
    const { status, amount, dueDate, notes, plan } = req.body;
    
    // Find renewal by ID
    let renewal = await Renewal.findById(req.params.id);
    
    if (!renewal) {
      return res.status(404).json({
        success: false,
        message: 'Renewal not found'
      });
    }
    
    // Update fields
    if (status) renewal.status = status;
    if (amount) renewal.amount = amount;
    if (dueDate) renewal.dueDate = dueDate;
    if (notes !== undefined) renewal.notes = notes;
    if (plan) renewal.plan = plan;
    
    // Save the renewal
    await renewal.save();
    
    // Return the updated renewal
    renewal = await Renewal.findById(req.params.id)
      .populate('user', 'name email status createdAt company phone');
    
    res.status(200).json({
      success: true,
      data: renewal
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

// @desc    Update renewal status
// @route   PUT /api/admin/renewals/:id/status
// @access  Private (Admin)
exports.updateRenewalStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }
    
    // Validate status
    const validStatuses = ['pending', 'paid', 'overdue', 'canceled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }
    
    // Find renewal by ID
    let renewal = await Renewal.findById(req.params.id);
    
    if (!renewal) {
      return res.status(404).json({
        success: false,
        message: 'Renewal not found'
      });
    }
    
    // Update status
    renewal.status = status;
    
    // If marking as paid, add payment record
    if (status === 'paid' && renewal.status !== 'paid') {
      // Add payment record
      if (!renewal.payments) {
        renewal.payments = [];
      }
      
      renewal.payments.push({
        date: new Date(),
        amount: renewal.amount,
        method: 'admin',
        status: 'success',
        processedBy: req.user.name
      });
      
      // Send confirmation email to user
      const user = await User.findById(renewal.user);
      if (user) {
        await emailService.sendPaymentConfirmation(
          user.email,
          user.name,
          renewal.plan,
          renewal.amount,
          new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
        );
      }
    }
    
    // Save the renewal
    await renewal.save();
    
    // Return the updated renewal
    renewal = await Renewal.findById(req.params.id);
    
    res.status(200).json({
      success: true,
      data: renewal
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

// @desc    Get renewal payment history
// @route   GET /api/admin/renewals/:id/payments
// @access  Private (Admin)
exports.getRenewalPayments = async (req, res) => {
  try {
    const renewal = await Renewal.findById(req.params.id);
    
    if (!renewal) {
      return res.status(404).json({
        success: false,
        message: 'Renewal not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: renewal.payments || []
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

// @desc    Process manual payment for renewal
// @route   POST /api/admin/renewals/:id/process-payment
// @access  Private (Admin)
exports.processRenewalPayment = async (req, res) => {
  try {
    const { amount, paymentMethod, transactionId, notes } = req.body;
    
    // Validate input
    if (!amount) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount is required'
      });
    }
    
    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Payment method is required'
      });
    }
    
    // Find renewal by ID
    let renewal = await Renewal.findById(req.params.id);
    
    if (!renewal) {
      return res.status(404).json({
        success: false,
        message: 'Renewal not found'
      });
    }
    
    // Create payment record
    const payment = {
      date: new Date(),
      amount: parseFloat(amount),
      method: paymentMethod,
      transactionId: transactionId || null,
      notes: notes || null,
      status: 'success',
      processedBy: req.user.name
    };
    
    // Add payment to renewal
    if (!renewal.payments) {
      renewal.payments = [];
    }
    
    renewal.payments.push(payment);
    
    // Update renewal status to paid
    renewal.status = 'paid';
    
    // Add notification
    if (!renewal.notifications) {
      renewal.notifications = [];
    }
    
    renewal.notifications.push({
      title: 'Payment Processed',
      message: `A payment of $${amount} was processed for this renewal.`,
      type: 'system',
      date: new Date(),
      sentBy: req.user.name
    });
    
    // Save the renewal
    await renewal.save();
    
    // Send confirmation email to user
    const user = await User.findById(renewal.user);
    if (user) {
      await emailService.sendPaymentConfirmation(
        user.email,
        user.name,
        renewal.plan,
        amount,
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
      );
    }
    
    // Return the updated renewal and payment details
    renewal = await Renewal.findById(req.params.id);
    
    res.status(200).json({
      success: true,
      data: {
        renewal,
        payment: renewal.payments[renewal.payments.length - 1]
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

// @desc    Send renewal reminder email
// @route   POST /api/admin/renewals/:id/send-reminder
// @access  Private (Admin)
exports.sendRenewalReminder = async (req, res) => {
  try {
    // Find renewal by ID
    const renewal = await Renewal.findById(req.params.id)
      .populate('user', 'name email');
    
    if (!renewal) {
      return res.status(404).json({
        success: false,
        message: 'Renewal not found'
      });
    }
    
    // Check if user exists
    if (!renewal.user) {
      return res.status(404).json({
        success: false,
        message: 'User not found for this renewal'
      });
    }
    
    // Send reminder email
    await emailService.sendRenewalReminder(
      renewal.user.email,
      renewal.user.name,
      renewal.plan,
      renewal.amount,
      renewal.dueDate
    );
    
    // Add notification record
    if (!renewal.notifications) {
      renewal.notifications = [];
    }
    
    renewal.notifications.push({
      title: 'Reminder Email Sent',
      message: `A reminder email was sent to ${renewal.user.email}.`,
      type: 'email',
      date: new Date(),
      sentBy: req.user.name
    });
    
    // Save the renewal
    await renewal.save();
    
    res.status(200).json({
      success: true,
      message: 'Renewal reminder sent successfully'
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
