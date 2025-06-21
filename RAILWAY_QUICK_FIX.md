# Quick Railway Deployment Fix

## Immediate Solution: Set Railway Environment Variables

Since GitHub is blocking the push due to secrets, set these variables directly in Railway:

### 1. Access Railway Dashboard
- Go to your Railway project
- Navigate to Variables tab

### 2. Set Environment Variables
```bash
# Core Configuration
NODE_ENV=production
PORT=5000

# Database (use one of these options)
# Option A: Real MongoDB Atlas cluster (if you have one)
MONGO_URI=mongodb+srv://username:password@cluster0.mongodb.net/altaro-cloud-backup?retryWrites=true&w=majority

# Option B: Leave empty for automatic fallback to in-memory database
# MONGO_URI=

# Security
JWT_SECRET=your_secure_jwt_secret_minimum_32_characters_abc123
JWT_EXPIRE=30d

# CORS
CORS_ORIGIN=https://social-media-platform-app.netlify.app
```

### 3. Trigger Redeploy
- After setting variables, Railway will automatically redeploy
- Or click "Deploy" in Railway dashboard

### 4. Test Deployment
```powershell
# Test health
Invoke-RestMethod -Uri "https://altaro-cloud-backup-production.up.railway.app/api/health" -Method GET

# Test login
$body = @{ email = "admin@altaro.com"; password = "admin123" } | ConvertTo-Json
Invoke-RestMethod -Uri "https://altaro-cloud-backup-production.up.railway.app/api/auth/login" -Method POST -Body $body -ContentType "application/json"
```

## Expected Results After Fix:
✅ Health endpoint shows MongoDB: "Connected"  
✅ Login returns JWT token successfully  
✅ No more 500 errors  
✅ Frontend authentication works  

## If Railway Variables Don't Work:
The production server has fallback logic that will use in-memory database automatically, so login should work regardless.
