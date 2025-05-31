const User = require('../models/User');
const bcrypt = require('bcryptjs');

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { name, email, company, phone } = req.body;
    
    // Find user
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (company) user.company = company;
    if (phone) user.phone = phone;
    
    // Save user
    await user.save();
    
    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        company: user.company,
        phone: user.phone,
        role: user.role,
        subscription: user.subscription
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

// @desc    Change password
// @route   PUT /api/users/password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Find user
    const user = await User.findById(req.user.id).select('+password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if current password matches
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
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

// @desc    Get subscription details
// @route   GET /api/users/subscription
// @access  Private
exports.getSubscription = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: user.subscription
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

// @desc    Update subscription auto-renewal settings
// @route   PUT /api/users/subscription/auto-renewal
// @access  Private
exports.updateAutoRenewal = async (req, res) => {
  try {
    const { autoRenew } = req.body;
    
    if (autoRenew === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide autoRenew value'
      });
    }
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Update auto-renewal setting
    user.subscription.autoRenew = autoRenew;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: `Auto-renewal ${autoRenew ? 'enabled' : 'disabled'} successfully`,
      data: user.subscription
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

// @desc    Update payment method
// @route   PUT /api/users/subscription/payment-method
// @access  Private
exports.updatePaymentMethod = async (req, res) => {
  try {
    const { paymentMethod, paymentDetails } = req.body;
    
    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a payment method'
      });
    }
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Update payment method and details
    user.subscription.paymentMethod = paymentMethod;
    
    if (paymentDetails) {
      user.subscription.paymentDetails = paymentDetails;
    }
    
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Payment method updated successfully',
      data: {
        paymentMethod: user.subscription.paymentMethod,
        paymentDetails: user.subscription.paymentDetails
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
