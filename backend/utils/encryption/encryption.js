const crypto = require('crypto');

/**
 * Encrypt a file or data buffer
 * @param {Buffer} data - The data to encrypt
 * @param {Buffer} key - The encryption key (must be 32 bytes for AES-256)
 * @returns {Buffer} - Encrypted data with IV prepended
 */
exports.encryptData = (data, key) => {
  const iv = crypto.randomBytes(16); // Initialization vector
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  
  const encryptedData = Buffer.concat([
    cipher.update(data),
    cipher.final()
  ]);
  
  // Return IV + encrypted data
  return Buffer.concat([iv, encryptedData]);
};

/**
 * Decrypt data
 * @param {Buffer} encryptedData - The encrypted data (with IV prepended)
 * @param {Buffer} key - The encryption key (must be 32 bytes for AES-256)
 * @returns {Buffer} - Decrypted data
 */
exports.decryptData = (encryptedData, key) => {
  // Extract IV (first 16 bytes)
  const iv = encryptedData.slice(0, 16);
  const data = encryptedData.slice(16);
  
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  
  return Buffer.concat([
    decipher.update(data),
    decipher.final()
  ]);
};

/**
 * Encrypt a file
 * @param {string} filePath - Path to the file to encrypt
 * @param {Buffer} key - The encryption key
 * @returns {Buffer} - Encrypted file data with IV prepended
 */
exports.encryptFile = (filePath, key) => {
  const fs = require('fs');
  const data = fs.readFileSync(filePath);
  return exports.encryptData(data, key);
};

/**
 * Generate a secure encryption key
 * @param {number} bytes - Number of bytes for the key (default: 32 for AES-256)
 * @returns {Buffer} - Random encryption key
 */
exports.generateEncryptionKey = (bytes = 32) => {
  return crypto.randomBytes(bytes);
};
