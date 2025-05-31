const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

/**
 * Upload a file to cloud storage
 * @param {string} service - Cloud service ('aws', 'azure', 'gcp', 'local')
 * @param {string} bucket - Bucket or container name
 * @param {string} filePath - Path to the local file
 * @param {string} destinationPath - Path in the cloud storage
 * @returns {Promise<boolean>} - True if upload successful
 */
exports.uploadToCloud = async (service, bucket, filePath, destinationPath) => {
  try {
    switch (service) {
      case 'aws':
        return await uploadToAWS(bucket, filePath, destinationPath);
      case 'azure':
        // Implement Azure Blob Storage upload
        throw new Error('Azure upload not implemented yet');
      case 'gcp':
        // Implement Google Cloud Storage upload
        throw new Error('GCP upload not implemented yet');
      case 'local':
        return await saveToLocalStorage(filePath, destinationPath);
      default:
        throw new Error(`Unsupported cloud service: ${service}`);
    }
  } catch (error) {
    console.error(`Error uploading to ${service}:`, error);
    return false;
  }
};

/**
 * Download a file from cloud storage
 * @param {string} service - Cloud service ('aws', 'azure', 'gcp', 'local')
 * @param {string} bucket - Bucket or container name
 * @param {string} cloudPath - Path to the file in cloud storage
 * @param {string} localPath - Path to save the file locally
 * @returns {Promise<boolean>} - True if download successful
 */
exports.downloadFromCloud = async (service, bucket, cloudPath, localPath) => {
  try {
    switch (service) {
      case 'aws':
        return await downloadFromAWS(bucket, cloudPath, localPath);
      case 'azure':
        // Implement Azure Blob Storage download
        throw new Error('Azure download not implemented yet');
      case 'gcp':
        // Implement Google Cloud Storage download
        throw new Error('GCP download not implemented yet');
      case 'local':
        return await getFromLocalStorage(cloudPath, localPath);
      default:
        throw new Error(`Unsupported cloud service: ${service}`);
    }
  } catch (error) {
    console.error(`Error downloading from ${service}:`, error);
    return false;
  }
};

/**
 * Delete a file from cloud storage
 * @param {string} service - Cloud service ('aws', 'azure', 'gcp', 'local')
 * @param {string} bucket - Bucket or container name
 * @param {string} cloudPath - Path to the file in cloud storage
 * @returns {Promise<boolean>} - True if deletion successful
 */
exports.deleteFromCloud = async (service, bucket, cloudPath) => {
  try {
    switch (service) {
      case 'aws':
        return await deleteFromAWS(bucket, cloudPath);
      case 'azure':
        // Implement Azure Blob Storage delete
        throw new Error('Azure delete not implemented yet');
      case 'gcp':
        // Implement Google Cloud Storage delete
        throw new Error('GCP delete not implemented yet');
      case 'local':
        return await deleteFromLocalStorage(cloudPath);
      default:
        throw new Error(`Unsupported cloud service: ${service}`);
    }
  } catch (error) {
    console.error(`Error deleting from ${service}:`, error);
    return false;
  }
};

/**
 * List files in cloud storage
 * @param {string} service - Cloud service ('aws', 'azure', 'gcp', 'local')
 * @param {string} bucket - Bucket or container name
 * @param {string} prefix - Path prefix to list
 * @returns {Promise<Array>} - Array of file objects
 */
exports.listFilesInCloud = async (service, bucket, prefix) => {
  try {
    switch (service) {
      case 'aws':
        return await listFilesInAWS(bucket, prefix);
      case 'azure':
        // Implement Azure Blob Storage list
        throw new Error('Azure list not implemented yet');
      case 'gcp':
        // Implement Google Cloud Storage list
        throw new Error('GCP list not implemented yet');
      case 'local':
        return await listFilesInLocalStorage(prefix);
      default:
        throw new Error(`Unsupported cloud service: ${service}`);
    }
  } catch (error) {
    console.error(`Error listing files in ${service}:`, error);
    return [];
  }
};

// AWS S3 Implementation
const uploadToAWS = async (bucket, filePath, destinationPath) => {
  const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    region: process.env.AWS_REGION
  });
  
  const fileContent = fs.readFileSync(filePath);
  
  const params = {
    Bucket: bucket,
    Key: destinationPath,
    Body: fileContent
  };
  
  await s3.upload(params).promise();
  return true;
};

const downloadFromAWS = async (bucket, cloudPath, localPath) => {
  const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    region: process.env.AWS_REGION
  });
  
  const params = {
    Bucket: bucket,
    Key: cloudPath
  };
  
  const data = await s3.getObject(params).promise();
  
  // Ensure directory exists
  const dir = path.dirname(localPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(localPath, data.Body);
  return true;
};

const deleteFromAWS = async (bucket, cloudPath) => {
  const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    region: process.env.AWS_REGION
  });
  
  // If cloudPath ends with '/', it's a directory, delete all objects with the prefix
  if (cloudPath.endsWith('/')) {
    const listParams = {
      Bucket: bucket,
      Prefix: cloudPath
    };
    
    const listedObjects = await s3.listObjectsV2(listParams).promise();
    
    if (listedObjects.Contents.length === 0) return true;
    
    const deleteParams = {
      Bucket: bucket,
      Delete: { Objects: [] }
    };
    
    listedObjects.Contents.forEach(({ Key }) => {
      deleteParams.Delete.Objects.push({ Key });
    });
    
    await s3.deleteObjects(deleteParams).promise();
    
    // If there are more objects to delete, recursively delete them
    if (listedObjects.IsTruncated) {
      await deleteFromAWS(bucket, cloudPath);
    }
  } else {
    const params = {
      Bucket: bucket,
      Key: cloudPath
    };
    
    await s3.deleteObject(params).promise();
  }
  
  return true;
};

const listFilesInAWS = async (bucket, prefix) => {
  const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    region: process.env.AWS_REGION
  });
  
  const params = {
    Bucket: bucket,
    Prefix: prefix
  };
  
  const data = await s3.listObjectsV2(params).promise();
  
  return data.Contents.map(item => ({
    name: item.Key.replace(prefix, ''),
    path: item.Key,
    size: item.Size,
    lastModified: item.LastModified
  }));
};

// Local Storage Implementation (for development/testing)
const saveToLocalStorage = async (filePath, destinationPath) => {
  const localStoragePath = path.join(__dirname, '../../local_storage');
  
  // Ensure directory exists
  const fullDestPath = path.join(localStoragePath, destinationPath);
  const destDir = path.dirname(fullDestPath);
  
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  
  // Copy file
  fs.copyFileSync(filePath, fullDestPath);
  return true;
};

const getFromLocalStorage = async (cloudPath, localPath) => {
  const localStoragePath = path.join(__dirname, '../../local_storage');
  
  // Ensure directory exists
  const dir = path.dirname(localPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Copy file
  fs.copyFileSync(path.join(localStoragePath, cloudPath), localPath);
  return true;
};

const deleteFromLocalStorage = async (cloudPath) => {
  const localStoragePath = path.join(__dirname, '../../local_storage');
  const fullPath = path.join(localStoragePath, cloudPath);
  
  if (fs.existsSync(fullPath)) {
    if (fs.statSync(fullPath).isDirectory()) {
      fs.rmdirSync(fullPath, { recursive: true });
    } else {
      fs.unlinkSync(fullPath);
    }
  }
  
  return true;
};

const listFilesInLocalStorage = async (prefix) => {
  const localStoragePath = path.join(__dirname, '../../local_storage');
  const fullPrefix = path.join(localStoragePath, prefix);
  
  if (!fs.existsSync(fullPrefix)) {
    return [];
  }
  
  const files = [];
  
  function walkDir(dir, basePrefix) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        walkDir(fullPath, path.join(basePrefix, item));
      } else {
        files.push({
          name: item,
          path: path.join(basePrefix, item).replace(/\\/g, '/'),
          size: stat.size,
          lastModified: stat.mtime
        });
      }
    }
  }
  
  try {
    walkDir(fullPrefix, prefix);
  } catch (error) {
    console.error('Error reading local storage directory:', error);
  }
  
  return files;
};
