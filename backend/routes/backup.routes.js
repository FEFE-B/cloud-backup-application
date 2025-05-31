const express = require('express');
const router = express.Router();
const {
  createBackup,
  getBackups,
  getBackup,
  updateBackup,
  deleteBackup,
  runBackup,
  getBackupHistory,
  getAllBackupHistory
} = require('../controllers/backup.controller');
const { protect } = require('../middleware/auth');

// Routes
router.route('/')
  .get(protect, getBackups)
  .post(protect, createBackup);

router.route('/:id')
  .get(protect, getBackup)
  .put(protect, updateBackup)
  .delete(protect, deleteBackup);

router.post('/:id/run', protect, runBackup);
router.get('/:id/history', protect, getBackupHistory);
router.get('/history', protect, getAllBackupHistory);

module.exports = router;
