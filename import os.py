import os
import zipfile
import boto3
import logging
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad

# Configure logging
logging.basicConfig(filename='backup_log.txt', level=logging.INFO, format='%(asctime)s - %(message)s')

# AWS S3 credentials and bucket name (replace with your actual credentials and bucket name)
AWS_ACCESS_KEY = 'your_access_key'
AWS_SECRET_KEY = 'your_secret_key'
BUCKET_NAME = 'your_bucket_name'

# Directory to backup (replace with your actual directory path)
DIRECTORY_TO_BACKUP = 'path_to_your_directory'

# Encryption key (must be 32 bytes for AES-256)
ENCRYPTION_KEY = b'your_32_byte_encryption_key'

def encrypt_file(file_path, key):
    """Encrypt a file using AES encryption."""
    cipher = AES.new(key, AES.MODE_CBC)
    with open(file_path, 'rb') as f:
        plaintext = f.read()
    ciphertext = cipher.encrypt(pad(plaintext, AES.block_size))
    return cipher.iv + ciphertext

def create_zip_archive(directory, zip_name):
    """Create a zip archive of the specified directory."""
    with zipfile.ZipFile(zip_name, 'w') as zipf:
        for root, _, files in os.walk(directory):
            for file in files:
                file_path = os.path.join(root, file)
                encrypted_data = encrypt_file(file_path, ENCRYPTION_KEY)
                zipf.writestr(file, encrypted_data)
    logging.info(f'Created zip archive: {zip_name}')

def upload_to_s3(file_name, bucket_name):
    """Upload a file to AWS S3."""
    s3 = boto3.client('s3', aws_access_key_id=AWS_ACCESS_KEY, aws_secret_access_key=AWS_SECRET_KEY)
    s3.upload_file(file_name, bucket_name, file_name)
    logging.info(f'Uploaded {file_name} to S3 bucket {bucket_name}')

def main():
    zip_name = 'backup.zip'
    create_zip_archive(DIRECTORY_TO_BACKUP, zip_name)
    upload_to_s3(zip_name, BUCKET_NAME)
    logging.info('Backup process completed successfully.')

if __name__ == '__main__':
    main()
