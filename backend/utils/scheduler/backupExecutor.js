const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const archiver = require('archiver');
const Backup = require('../../models/Backup');
const BackupHistory = require('../../models/BackupHistory');
const { encryptFile } = require('../encryption/encryption');
const { uploadToCloud, deleteFromCloud } = require('../cloud_storage/cloudStorage');

/**
 * Execute a backup
 * @param {Object} backup - Backup configuration
 * @param {Object} backupHistory - Backup history entry
 * @returns {Promise<boolean>} - True if backup successful
 */
exports.executeBackup = async (backup, backupHistory) => {
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
