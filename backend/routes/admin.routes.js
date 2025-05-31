const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  getUsersList,
  getUserBackups,
  getUserRenewals,
  getUserHistory,
  updateUserStatus,
  getDashboardStats,
  getRecentUsers,
  getRecentBackups,
  getChartData
} = require('../controllers/admin.controller');

const {
  getRenewals,
  getRenewalDetails,
  updateRenewal,
  updateRenewalStatus,
  getRenewalPayments,
  processRenewalPayment,
  sendRenewalReminder,
  getRenewalsSummary
} = require('../controllers/admin.renewal.controller');

const {
  getBackups,
  getBackupsSummary,
  runBackup,
  updateBackupStatus
} = require('../controllers/admin.backup.controller');

const { protect, authorize } = require('../middleware/auth');

// Apply middleware to all routes
router.use(protect);
router.use(authorize('admin'));

// Dashboard routes
router.get('/dashboard', getDashboardStats);
router.get('/users/recent', getRecentUsers);
router.get('/backups/recent', getRecentBackups);
router.get('/charts', getChartData);

// User routes
router.get('/users/list', getUsersList);
router.route('/users')
  .get(getUsers);

router.route('/users/:id')
  .get(getUser)
  .put(updateUser)
  .delete(deleteUser);

router.put('/users/:id/status', updateUserStatus);
router.get('/users/:id/backups', getUserBackups);
router.get('/users/:id/renewals', getUserRenewals);
router.get('/users/:id/history', getUserHistory);

// Renewal routes
router.get('/renewals/summary', getRenewalsSummary);
router.route('/renewals')
  .get(getRenewals);

router.route('/renewals/:id')
  .get(getRenewalDetails)
  .put(updateRenewal);

router.put('/renewals/:id/status', updateRenewalStatus);
router.get('/renewals/:id/payments', getRenewalPayments);
router.post('/renewals/:id/process-payment', processRenewalPayment);
router.post('/renewals/:id/send-reminder', sendRenewalReminder);

// Backup routes
router.get('/backups/summary', getBackupsSummary);
router.route('/backups')
  .get(getBackups);

router.post('/backups/:id/run', runBackup);
router.put('/backups/:id/status', updateBackupStatus);

module.exports = router;
