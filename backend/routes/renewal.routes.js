const express = require('express');
const router = express.Router();
const {
  createRenewal,
  getRenewals,
  getUserRenewals,
  getRenewal,
  updateRenewal,
  deleteRenewal
} = require('../controllers/renewal.controller');
const { protect, authorize } = require('../middleware/auth');

// Routes
router.route('/')
  .get(protect, authorize('admin'), getRenewals)
  .post(protect, authorize('admin'), createRenewal);

router.route('/:id')
  .get(protect, getRenewal)
  .put(protect, authorize('admin'), updateRenewal)
  .delete(protect, authorize('admin'), deleteRenewal);

router.get('/user/:userId', protect, getUserRenewals);

module.exports = router;
