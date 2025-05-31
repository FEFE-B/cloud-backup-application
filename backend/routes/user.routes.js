const express = require('express');
const router = express.Router();
const {
  updateProfile,
  changePassword,
  getSubscription,
  updateAutoRenewal,
  updatePaymentMethod
} = require('../controllers/user.controller');
const { protect } = require('../middleware/auth');

// Apply middleware to all routes
router.use(protect);

// Routes
router.put('/profile', updateProfile);
router.put('/password', changePassword);
router.get('/subscription', getSubscription);
router.put('/subscription/auto-renewal', updateAutoRenewal);
router.put('/subscription/payment-method', updatePaymentMethod);

module.exports = router;
