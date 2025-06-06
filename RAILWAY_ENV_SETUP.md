# Railway Environment Variables Setup

Since we cannot commit sensitive environment variables to the repository, you need to set these directly in Railway's dashboard.

## Required Environment Variables for Railway:

Navigate to your Railway project → Variables → Environment Variables and add:

### Core Configuration
```
NODE_ENV=production
PORT=5000
```

### Database Configuration
```
MONGO_URI=mongodb+srv://[USERNAME]:[PASSWORD]@cluster0.mongodb.net/altaro-cloud-backup?retryWrites=true&w=majority
```
**Note**: Replace [USERNAME] and [PASSWORD] with your MongoDB Atlas credentials, or use the in-memory fallback if cluster doesn't exist.

### Security
```
JWT_SECRET=your_secure_jwt_secret_key_here_minimum_32_characters
JWT_EXPIRE=30d
```

### CORS Configuration
```
CORS_ORIGIN=https://social-media-platform-app.netlify.app
```

### Email Configuration (Optional)
```
EMAIL_SERVICE=smtp
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_email_app_password
EMAIL_FROM=noreply@socialmediaplatform.com
```

### AWS Configuration (Optional)
```
AWS_ACCESS_KEY=your_aws_access_key
AWS_SECRET_KEY=your_aws_secret_key
AWS_BUCKET_NAME=your-bucket-name
AWS_REGION=us-east-1
```

### Encryption (Optional)
```
ENCRYPTION_KEY=your_32_byte_encryption_key_here
```

## Important Notes:

1. **MongoDB Atlas**: If the cluster `cluster0.mongodb.net` doesn't exist, the production server will automatically fall back to an in-memory database
2. **JWT Secret**: Generate a secure random string of at least 32 characters
3. **CORS Origin**: Must match your frontend URL exactly
4. **Railway Deployment**: After setting these variables, Railway will automatically redeploy

## Test Credentials:

Once deployed, you can test with these credentials:
- **Admin**: admin@altaro.com / admin123
- **User**: user@altaro.com / admin123

## Verification:

After deployment, test these endpoints:
- `GET https://your-railway-url.up.railway.app/api/health` - Should return server status
- `POST https://your-railway-url.up.railway.app/api/auth/login` - Should accept login credentials
