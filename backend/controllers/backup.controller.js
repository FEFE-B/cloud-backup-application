const Backup = require('../models/Backup');
const BackupHistory = require('../models/BackupHistory');
const User = require('../models/User');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const crypto = require('crypto');
const { promisify } = require('util');
const { pipeline } = require('stream');
const zlib = require('zlib');
const archiver = require('archiver');
const { encryptFile, decryptFile } = require('../utils/encryption/encryption');
const { uploadToCloud, downloadFromCloud, deleteFromCloud, listFilesInCloud } = require('../utils/cloud_storage/cloudStorage');

// Create promisified versions of functions
const pipelineAsync = promisify(pipeline);

// @desc    Create a new backup configuration
// @route   POST /api/backup
// @access  Private
exports.createBackup = async (req, res) => {
  try {
    const {
      name,
      description,
      sourceDirectory,
      type,
      frequency,
      retention,
      encryptionEnabled,
      compressionEnabled
    } = req.body;

    // Add user to request body
    req.body.user = req.user.id;

    // Check if user has active subscription
    const user = await User.findById(req.user.id);
    if (!user.subscription.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Your subscription is inactive. Please renew to create backups.'
      });
    }

    // Check if source directory exists
    if (!fs.existsSync(sourceDirectory)) {
      return res.status(400).json({
        success: false,
        message: 'Source directory does not exist'
      });
    }

    // Calculate next run date based on frequency
    let nextRun = null;
    if (frequency !== 'manual') {
      nextRun = new Date();
      
      switch (frequency) {
        case 'daily':
          nextRun.setDate(nextRun.getDate() + 1);
          break;
        case 'weekly':
          nextRun.setDate(nextRun.getDate() + 7);
          break;
        case 'monthly':
          nextRun.setMonth(nextRun.getMonth() + 1);
          break;
      }
    }

    // Create backup
    const backup = await Backup.create({
      ...req.body,
      nextRun,
      cloudLocation: {
        service: 'aws',
        bucketName: process.env.AWS_BUCKET_NAME,
        path: `${req.user.id}/${name.replace(/[^a-zA-Z0-9]/g, '_')}`
      }
    });

    res.status(201).json({
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

// @desc    Get all backups for a user
// @route   GET /api/backup
// @access  Private
exports.getBackups = async (req, res) => {
  try {
    const backups = await Backup.find({ user: req.user.id });

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

// @desc    Get a single backup
// @route   GET /api/backup/:id
// @access  Private
exports.getBackup = async (req, res) => {
  try {
    const backup = await Backup.findById(req.params.id);

    if (!backup) {
      return res.status(404).json({
        success: false,
        message: 'Backup not found'
      });
    }

    // Make sure user owns the backup
    if (backup.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this backup'
      });
    }

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

// @desc    Update a backup
// @route   PUT /api/backup/:id
// @access  Private
exports.updateBackup = async (req, res) => {
  try {
    let backup = await Backup.findById(req.params.id);

    if (!backup) {
      return res.status(404).json({
        success: false,
        message: 'Backup not found'
      });
    }

    // Make sure user owns the backup
    if (backup.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to update this backup'
      });
    }

    // Check if source directory exists if it's being updated
    if (req.body.sourceDirectory && !fs.existsSync(req.body.sourceDirectory)) {
      return res.status(400).json({
        success: false,
        message: 'Source directory does not exist'
      });
    }

    // Update next run date if frequency is updated
    if (req.body.frequency && req.body.frequency !== backup.frequency) {
      let nextRun = new Date();
      
      switch (req.body.frequency) {
        case 'daily':
          nextRun.setDate(nextRun.getDate() + 1);
          break;
        case 'weekly':
          nextRun.setDate(nextRun.getDate() + 7);
          break;
        case 'monthly':
          nextRun.setMonth(nextRun.getMonth() + 1);
          break;
        case 'manual':
          nextRun = null;
          break;
      }
      
      req.body.nextRun = nextRun;
    }

    backup = await Backup.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
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

// @desc    Delete a backup
// @route   DELETE /api/backup/:id
// @access  Private
exports.deleteBackup = async (req, res) => {
  try {
    const backup = await Backup.findById(req.params.id);

    if (!backup) {
      return res.status(404).json({
        success: false,
        message: 'Backup not found'
      });
    }

    // Make sure user owns the backup
    if (backup.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to delete this backup'
      });
    }

    // Delete backup histories
    await BackupHistory.deleteMany({ backup: backup._id });

    // Delete from cloud storage
    try {
      await deleteFromCloud(
        backup.cloudLocation.service,
        backup.cloudLocation.bucketName,
        backup.cloudLocation.path
      );
    } catch (err) {
      console.error('Error deleting from cloud:', err);
      // Continue with deletion even if cloud deletion fails
    }

    // Delete backup
    await backup.remove();

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

// @desc    Run a backup
// @route   POST /api/backup/:id/run
// @access  Private
exports.runBackup = async (req, res) => {
  try {
    const backup = await Backup.findById(req.params.id);

    if (!backup) {
      return res.status(404).json({
        success: false,
        message: 'Backup not found'
      });
    }

    // Make sure user owns the backup
    if (backup.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to run this backup'
      });
    }

    // Check if user has active subscription
    const user = await User.findById(req.user.id);
    if (!user.subscription.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Your subscription is inactive. Please renew to run backups.'
      });
    }

    // Create backup history entry
    const backupHistory = await BackupHistory.create({
      backup: backup._id,
      user: req.user.id,
      startTime: new Date(),
      status: 'in-progress',
      type: backup.type,
      cloudLocation: backup.cloudLocation
    });

    // Start backup process asynchronously
    processBackup(backup, backupHistory);

    // Update backup status
    backup.status = 'in-progress';
    backup.lastRun = new Date();
    await backup.save();

    res.status(200).json({
      success: true,
      message: 'Backup started',
      data: {
        backupId: backup._id,
        historyId: backupHistory._id
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

// @desc    Get backup history
// @route   GET /api/backup/:id/history
// @access  Private
exports.getBackupHistory = async (req, res) => {
  try {
    const backup = await Backup.findById(req.params.id);

    if (!backup) {
      return res.status(404).json({
        success: false,
        message: 'Backup not found'
      });
    }

    // Make sure user owns the backup
    if (backup.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this backup history'
      });
    }

    const history = await BackupHistory.find({ backup: backup._id })
      .sort({ startTime: -1 });

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

// @desc    Get all backup history for a user
// @route   GET /api/backup/history
// @access  Private
exports.getAllBackupHistory = async (req, res) => {
  try {
    const history = await BackupHistory.find({ user: req.user.id })
      .sort({ startTime: -1 })
      .populate('backup', 'name');

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

// @desc    Execute a backup
// @route   POST /api/backup/:id/execute
// @access  Private
exports.executeBackup = async (req, res) => {
  try {
    // Find backup
    const backup = await Backup.findById(req.params.id);
    
    if (!backup) {
      return res.status(404).json({
        success: false,
        message: 'Backup not found'
      });
    }
    
    // Check if backup belongs to user
    if (backup.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this backup'
      });
    }
    
    // Check if source directory exists
    if (!fs.existsSync(backup.sourceDirectory)) {
      return res.status(400).json({
        success: false,
        message: 'Source directory does not exist'
      });
    }
    
    // Check user's subscription status
    const user = await User.findById(req.user.id);
    if (!user.subscription.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Your subscription is inactive. Please renew to execute backups.'
      });
    }
    
    // Create backup history entry
    const backupHistory = await BackupHistory.create({
      backup: backup._id,
      user: req.user.id,
      startTime: new Date(),
      status: 'in-progress',
      type: backup.type,
      cloudLocation: {
        service: backup.cloudLocation.service,
        bucketName: backup.cloudLocation.bucketName,
        path: `${backup.cloudLocation.path}/${new Date().toISOString().replace(/:/g, '-')}`
      }
    });
    
    // Update backup status
    backup.status = 'in-progress';
    backup.lastRun = new Date();
    await backup.save();
    
    // Start backup process asynchronously
    performBackup(backup, backupHistory)
      .then(() => {
        console.log(`Backup completed: ${backup.name}`);
      })
      .catch(err => {
        console.error(`Backup failed: ${backup.name}`, err);
      });
    
    res.status(200).json({
      success: true,
      message: 'Backup started successfully',
      data: backupHistory
    });
  } catch (error) {
    console.error('Error executing backup:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Perform the actual backup process
 * @param {Object} backup - Backup configuration
 * @param {Object} backupHistory - Backup history entry
 */
const performBackup = async (backup, backupHistory) => {
  // Create temp directory for processing
  const tempDir = path.join(process.env.TEMP_DIR || '/tmp', `backup-${backup._id}-${Date.now()}`);
  const tempZipPath = path.join(tempDir, `${backup.name.replace(/[^a-zA-Z0-9]/g, '_')}.zip`);
  const tempEncryptedPath = path.join(tempDir, `${backup.name.replace(/[^a-zA-Z0-9]/g, '_')}.zip.enc`);
  
  try {
    // Create temp directory
    await fsPromises.mkdir(tempDir, { recursive: true });
    
    // Get files to backup based on backup type
    const filesToBackup = await getFilesToBackup(backup);
    
    if (filesToBackup.length === 0) {
      throw new Error('No files to backup');
    }
    
    // Create zip archive
    await createZipArchive(backup.sourceDirectory, filesToBackup, tempZipPath, backup.compressionEnabled);
    
    // Get zip file size
    const zipStats = await fsPromises.stat(tempZipPath);
    backupHistory.size = zipStats.size;
    backupHistory.filesCount = filesToBackup.length;
    
    // Encrypt zip file if encryption is enabled
    const finalFilePath = backup.encryptionEnabled 
      ? await encryptBackupFile(tempZipPath, tempEncryptedPath)
      : tempZipPath;
    
    // Upload to cloud storage
    const uploadSuccess = await uploadToCloud(
      backup.cloudLocation.service,
      backup.cloudLocation.bucketName,
      finalFilePath,
      `${backupHistory.cloudLocation.path}/backup${path.extname(finalFilePath)}`
    );
    
    if (!uploadSuccess) {
      throw new Error('Failed to upload backup to cloud storage');
    }
    
    // Update backup history with success
    backupHistory.status = 'completed';
    backupHistory.endTime = new Date();
    await backupHistory.save();
    
    // Update backup
    backup.status = 'completed';
    backup.size = backupHistory.size;
    
    // Calculate next run based on frequency
    if (backup.frequency !== 'manual') {
      backup.nextRun = calculateNextRun(backup.frequency);
    }
    
    await backup.save();
    
    // Clean up temporary files
    await cleanupTempFiles(tempDir);
    
    // Clean up old backups based on retention policy
    await cleanupOldBackups(backup);
    
    return true;
  } catch (error) {
    // Update backup history with failure
    backupHistory.status = 'failed';
    backupHistory.endTime = new Date();
    backupHistory.error = {
      message: error.message,
      stack: error.stack
    };
    await backupHistory.save();
    
    // Update backup status
    backup.status = 'failed';
    await backup.save();
    
    // Clean up temporary files
    await cleanupTempFiles(tempDir);
    
    console.error('Backup execution failed:', error);
    return false;
  }
};

/**
 * Get files to backup based on backup type
 * @param {Object} backup - Backup configuration
 * @returns {Promise<Array>} - Array of file paths relative to source directory
 */
const getFilesToBackup = async (backup) => {
  const sourceDir = backup.sourceDirectory;
  const files = [];
  
  // Get list of files in the source directory recursively
  const getFilesRecursively = async (dir, baseDir = '') => {
    const entries = await fsPromises.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(baseDir, entry.name);
      
      if (entry.isDirectory()) {
        await getFilesRecursively(fullPath, relativePath);
      } else {
        // Filter files based on backup type
        if (backup.type === 'full') {
          // Include all files
          files.push(relativePath);
        } else {
          // For incremental or differential, check modification time
          const stats = await fsPromises.stat(fullPath);
          const lastRun = backup.lastRun ? new Date(backup.lastRun) : new Date(0);
          
          if (backup.type === 'incremental' && stats.mtime > lastRun) {
            // Incremental: files modified since last backup
            files.push(relativePath);
          } else if (backup.type === 'differential') {
            // Find the first successful backup
            const firstBackup = await BackupHistory.findOne({
              backup: backup._id,
              status: 'completed'
            }).sort({ startTime: 1 });
            
            const firstBackupTime = firstBackup ? new Date(firstBackup.startTime) : new Date(0);
            
            if (stats.mtime > firstBackupTime) {
              // Differential: files modified since first backup
              files.push(relativePath);
            }
          }
        }
      }
    }
  };
  
  await getFilesRecursively(sourceDir);
  return files;
};

/**
 * Create a zip archive of the files to backup
 * @param {string} sourceDir - Source directory
 * @param {Array} files - Array of file paths relative to source directory
 * @param {string} outputPath - Path to save the zip file
 * @param {boolean} compress - Whether to compress the archive
 * @returns {Promise<void>}
 */
const createZipArchive = async (sourceDir, files, outputPath, compress) => {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', {
      zlib: { level: compress ? 9 : 0 } // Compression level (0 = no compression)
    });
    
    output.on('close', () => {
      resolve();
    });
    
    archive.on('error', (err) => {
      reject(err);
    });
    
    archive.pipe(output);
    
    // Add each file to the archive
    for (const file of files) {
      const filePath = path.join(sourceDir, file);
      archive.file(filePath, { name: file });
    }
    
    archive.finalize();
  });
};

/**
 * Encrypt the backup file
 * @param {string} inputPath - Path to the input file
 * @param {string} outputPath - Path to save the encrypted file
 * @returns {Promise<string>} - Path to the encrypted file
 */
const encryptBackupFile = async (inputPath, outputPath) => {
  await encryptFile(inputPath, outputPath);
  return outputPath;
};

/**
 * Clean up temporary files
 * @param {string} tempDir - Path to the temporary directory
 * @returns {Promise<void>}
 */
const cleanupTempFiles = async (tempDir) => {
  try {
    await fsPromises.rm(tempDir, { recursive: true, force: true });
  } catch (error) {
    console.error('Failed to clean up temporary files:', error);
  }
};

/**
 * Calculate the next run date based on frequency
 * @param {string} frequency - Backup frequency (daily, weekly, monthly)
 * @returns {Date} - Next run date
 */
const calculateNextRun = (frequency) => {
  const nextRun = new Date();
  
  switch (frequency) {
    case 'daily':
      nextRun.setDate(nextRun.getDate() + 1);
      break;
    case 'weekly':
      nextRun.setDate(nextRun.getDate() + 7);
      break;
    case 'monthly':
      nextRun.setMonth(nextRun.getMonth() + 1);
      break;
  }
  
  return nextRun;
};

/**
 * Clean up old backups based on retention policy
 * @param {Object} backup - Backup configuration
 * @returns {Promise<void>}
 */
const cleanupOldBackups = async (backup) => {
  try {
    // Calculate retention date
    const retentionDays = backup.retention.days || 30;
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - retentionDays);
    
    // Find old backup history entries
    const oldBackups = await BackupHistory.find({
      backup: backup._id,
      status: 'completed',
      startTime: { $lt: retentionDate }
    });
    
    // Delete old backups from cloud storage
    for (const oldBackup of oldBackups) {
      // Delete from cloud storage
      await deleteFromCloud(
        oldBackup.cloudLocation.service,
        oldBackup.cloudLocation.bucketName,
        `${oldBackup.cloudLocation.path}/backup${backup.encryptionEnabled ? '.zip.enc' : '.zip'}`
      );
      
      // Update backup history status
      oldBackup.status = 'deleted';
      await oldBackup.save();
    }
  } catch (error) {
    console.error('Failed to clean up old backups:', error);
  }
};

// @desc    Restore a backup
// @route   POST /api/backup/restore/:historyId
// @access  Private
exports.restoreBackup = async (req, res) => {
  try {
    // Find backup history entry
    const backupHistory = await BackupHistory.findById(req.params.historyId)
      .populate('backup');
    
    if (!backupHistory) {
      return res.status(404).json({
        success: false,
        message: 'Backup history not found'
      });
    }
    
    // Check if backup belongs to user
    if (backupHistory.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to restore this backup'
      });
    }
    
    // Check user's subscription status
    const user = await User.findById(req.user.id);
    if (!user.subscription.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Your subscription is inactive. Please renew to restore backups.'
      });
    }
    
    // Get restoration directory from request body
    const { targetDirectory } = req.body;
    
    if (!targetDirectory) {
      return res.status(400).json({
        success: false,
        message: 'Target directory is required'
      });
    }
    
    // Check if target directory exists and is writable
    try {
      await fsPromises.access(targetDirectory, fs.constants.W_OK);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: 'Target directory does not exist or is not writable'
      });
    }
    
    // Start restoration process asynchronously
    performRestore(backupHistory, targetDirectory)
      .then(() => {
        console.log(`Restoration completed: ${backupHistory._id}`);
      })
      .catch(err => {
        console.error(`Restoration failed: ${backupHistory._id}`, err);
      });
    
    res.status(200).json({
      success: true,
      message: 'Restoration started successfully'
    });
  } catch (error) {
    console.error('Error restoring backup:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Perform the actual restoration process
 * @param {Object} backupHistory - Backup history entry
 * @param {string} targetDirectory - Directory to restore files to
 * @returns {Promise<boolean>} - True if restoration successful
 */
const performRestore = async (backupHistory, targetDirectory) => {
  // Create temp directory for processing
  const tempDir = path.join(process.env.TEMP_DIR || '/tmp', `restore-${backupHistory._id}-${Date.now()}`);
  const tempZipPath = path.join(tempDir, 'backup.zip');
  const tempEncryptedPath = path.join(tempDir, 'backup.zip.enc');
  
  try {
    // Create temp directory
    await fsPromises.mkdir(tempDir, { recursive: true });
    
    // Download from cloud storage
    const cloudPath = `${backupHistory.cloudLocation.path}/backup${backupHistory.backup.encryptionEnabled ? '.zip.enc' : '.zip'}`;
    const downloadPath = backupHistory.backup.encryptionEnabled ? tempEncryptedPath : tempZipPath;
    
    const downloadSuccess = await downloadFromCloud(
      backupHistory.cloudLocation.service,
      backupHistory.cloudLocation.bucketName,
      cloudPath,
      downloadPath
    );
    
    if (!downloadSuccess) {
      throw new Error('Failed to download backup from cloud storage');
    }
    
    // Decrypt zip file if it was encrypted
    const finalZipPath = backupHistory.backup.encryptionEnabled 
      ? await decryptBackupFile(tempEncryptedPath, tempZipPath)
      : tempZipPath;
    
    // Extract zip archive to target directory
    await extractZipArchive(finalZipPath, targetDirectory);
    
    // Clean up temporary files
    await cleanupTempFiles(tempDir);
    
    return true;
  } catch (error) {
    // Clean up temporary files
    await cleanupTempFiles(tempDir);
    
    console.error('Restoration failed:', error);
    return false;
  }
};

/**
 * Decrypt the backup file
 * @param {string} inputPath - Path to the encrypted file
 * @param {string} outputPath - Path to save the decrypted file
 * @returns {Promise<string>} - Path to the decrypted file
 */
const decryptBackupFile = async (inputPath, outputPath) => {
  await decryptFile(inputPath, outputPath);
  return outputPath;
};

/**
 * Extract a zip archive to a target directory
 * @param {string} zipPath - Path to the zip file
 * @param {string} targetDir - Directory to extract to
 * @returns {Promise<void>}
 */
const extractZipArchive = async (zipPath, targetDir) => {
  return new Promise((resolve, reject) => {
    const extract = require('extract-zip');
    
    extract(zipPath, { dir: targetDir })
      .then(() => resolve())
      .catch(err => reject(err));
  });
};
