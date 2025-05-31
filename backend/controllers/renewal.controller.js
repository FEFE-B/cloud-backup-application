const Renewal = require('../models/Renewal');
const User = require('../models/User');
const { sendEmail } = require('../utils/auth/emailService');

// @desc    Create a new renewal record
// @route   POST /api/renewals
// @access  Private (Admin)
exports.createRenewal = async (req, res) => {
  try {
    const {
      userId,
      subscriptionPlan,
      currentExpiryDate,
      newExpiryDate,
      price,
      currency,
      discount,
      paymentMethod,
      notes
    } = req.body;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Create renewal record
    const renewal = await Renewal.create({
      user: userId,
      subscriptionPlan,
      currentExpiryDate,
      newExpiryDate,
      price,
      currency,
      discount,
      paymentMethod,
      notes
    });

    res.status(201).json({
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

// @desc    Get all renewals
// @route   GET /api/renewals
// @access  Private (Admin)
exports.getRenewals = async (req, res) => {
  try {
    const renewals = await Renewal.find()
      .populate('user', 'name email company')
      .sort({ createdAt: -1 });

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

// @desc    Get renewals for a specific user
// @route   GET /api/renewals/user/:userId
// @access  Private
exports.getUserRenewals = async (req, res) => {
  try {
    const renewals = await Renewal.find({ user: req.params.userId })
      .sort({ createdAt: -1 });

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

// @desc    Get a single renewal by ID
// @route   GET /api/renewals/:id
// @access  Private
exports.getRenewal = async (req, res) => {
  try {
    const renewal = await Renewal.findById(req.params.id)
      .populate('user', 'name email company');

    if (!renewal) {
      return res.status(404).json({
        success: false,
        message: 'Renewal not found'
      });
    }

    // Check if user is admin or the owner of the renewal
    if (req.user.role !== 'admin' && renewal.user._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this renewal'
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

// @desc    Update renewal status
// @route   PUT /api/renewals/:id
// @access  Private (Admin)
exports.updateRenewal = async (req, res) => {
  try {
    let renewal = await Renewal.findById(req.params.id);

    if (!renewal) {
      return res.status(404).json({
        success: false,
        message: 'Renewal not found'
      });
    }

    renewal = await Renewal.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    // If status is changed to 'paid', update the user's subscription
    if (req.body.status === 'paid' && renewal.status === 'paid') {
      const user = await User.findById(renewal.user);
      
      user.subscription.plan = renewal.subscriptionPlan;
      user.subscription.expiryDate = renewal.newExpiryDate;
      user.subscription.paymentMethod = renewal.paymentMethod;
      
      // If payment details are provided, update them
      if (req.body.paymentDetails) {
        user.subscription.paymentDetails = req.body.paymentDetails;
      }
      
      await user.save();
      
      // Send confirmation email
      await sendEmail({
        email: user.email,
        subject: 'Altaro Cloud Backup Subscription Renewed',
        message: `Dear ${user.name},\n\nYour subscription has been successfully renewed. Your new expiry date is ${new Date(renewal.newExpiryDate).toLocaleDateString()}.\n\nThank you for using Altaro Cloud Backup!`
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

// @desc    Delete a renewal
// @route   DELETE /api/renewals/:id
// @access  Private (Admin)
exports.deleteRenewal = async (req, res) => {
  try {
    const renewal = await Renewal.findById(req.params.id);

    if (!renewal) {
      return res.status(404).json({
        success: false,
        message: 'Renewal not found'
      });
    }

    await renewal.remove();

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

// @desc    Check for upcoming renewals and send notifications
// @route   No route - called by cron job
// @access  Private (System)
exports.checkForUpcomingRenewals = async () => {
  try {
    const today = new Date();
    
    // Get notification days from environment variables
    const notificationDays = process.env.RENEWAL_NOTIFICATION_DAYS.split(',').map(Number);
    
    // Find all active users
    const users = await User.find({
      'subscription.isActive': true
    });
    
    for (const user of users) {
      const expiryDate = new Date(user.subscription.expiryDate);
      
      // Calculate days until expiry
      const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
      
      // Check if we need to send a notification
      if (notificationDays.includes(daysUntilExpiry)) {
        // Create renewal record if it doesn't exist
        let renewal = await Renewal.findOne({
          user: user._id,
          currentExpiryDate: user.subscription.expiryDate,
          status: 'pending'
        });
        
        if (!renewal) {
          // Calculate new expiry date (1 year from current expiry)
          const newExpiryDate = new Date(expiryDate);
          newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);
          
          // Set price based on subscription plan
          let price = 0;
          switch (user.subscription.plan) {
            case 'basic':
              price = 99.99;
              break;
            case 'premium':
              price = 199.99;
              break;
            case 'enterprise':
              price = 499.99;
              break;
            default:
              price = 0;
          }
          
          renewal = await Renewal.create({
            user: user._id,
            subscriptionPlan: user.subscription.plan,
            currentExpiryDate: user.subscription.expiryDate,
            newExpiryDate,
            price,
            status: 'pending',
            notificationsSent: []
          });
        }
        
        // Send notification if not already sent for this milestone
        const notificationType = `${daysUntilExpiry}-day`;
        if (!renewal.notificationsSent.includes(notificationType)) {
          // Send email notification
          await sendEmail({
            email: user.email,
            subject: `Your Altaro Cloud Backup subscription expires in ${daysUntilExpiry} days`,
            message: `Dear ${user.name},\n\nYour Altaro Cloud Backup subscription will expire in ${daysUntilExpiry} days. Please renew your subscription to continue enjoying our services.\n\nSubscription Details:\nPlan: ${user.subscription.plan}\nExpiry Date: ${expiryDate.toLocaleDateString()}\nPrice: $${renewal.price}\n\nYou can renew your subscription by logging into your account at altarobackup.com.\n\nThank you for choosing Altaro Cloud Backup!`
          });
          
          // Update notification record
          renewal.notificationsSent.push(notificationType);
          await renewal.save();
          
          console.log(`Sent ${daysUntilExpiry}-day renewal notification to ${user.email}`);
        }
      }
      
      // Check if subscription has expired
      if (daysUntilExpiry < 0 && user.subscription.isActive) {
        // Deactivate subscription
        user.subscription.isActive = false;
        await user.save();
        
        // Send expiration notification
        let renewal = await Renewal.findOne({
          user: user._id,
          currentExpiryDate: user.subscription.expiryDate,
          status: 'pending'
        });
        
        if (renewal && !renewal.notificationsSent.includes('expired')) {
          // Send email notification
          await sendEmail({
            email: user.email,
            subject: 'Your Altaro Cloud Backup subscription has expired',
            message: `Dear ${user.name},\n\nYour Altaro Cloud Backup subscription has expired. Your data will be retained for 30 days, after which it may be permanently deleted.\n\nTo reactivate your subscription and ensure continuous protection of your data, please log in to your account at altarobackup.com.\n\nThank you for choosing Altaro Cloud Backup!`
          });
          
          // Update notification record
          renewal.notificationsSent.push('expired');
          await renewal.save();
          
          console.log(`Sent expiration notification to ${user.email}`);
        }
      }
    }
    
    console.log('Renewal notification check completed successfully');
  } catch (error) {
    console.error('Error checking for upcoming renewals:', error);
  }
};
