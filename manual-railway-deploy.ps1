# Manual Railway Deployment Guide
# Since Railway CLI might not be available, here's how to deploy manually

Write-Host "📦 MANUAL RAILWAY DEPLOYMENT GUIDE" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

Write-Host "`n🎯 DEPLOYMENT STEPS:" -ForegroundColor Yellow

Write-Host "`n1. 📋 GITHUB REPOSITORY SETUP" -ForegroundColor Green
Write-Host "   • Create a new GitHub repository or use existing one"
Write-Host "   • Push your backend code to GitHub"
Write-Host "   • Ensure railway-server.js is set as main in package.json"

Write-Host "`n2. 🚀 RAILWAY PROJECT SETUP" -ForegroundColor Green
Write-Host "   • Go to https://railway.app"
Write-Host "   • Login/Sign up with GitHub"
Write-Host "   • Click 'New Project'"
Write-Host "   • Select 'Deploy from GitHub repo'"
Write-Host "   • Choose your repository"
Write-Host "   • Select the /backend folder"

Write-Host "`n3. 🔧 ENVIRONMENT VARIABLES" -ForegroundColor Green
Write-Host "   Set these variables in Railway dashboard:"
Write-Host "   • NODE_ENV = production"
Write-Host "   • JWT_SECRET = railway_production_jwt_secret_12345"
Write-Host "   • CORS_ORIGIN = https://social-media-platform-app.netlify.app"
Write-Host "   • PORT = (leave empty, Railway auto-assigns)"

Write-Host "`n4. ⚙️ BUILD SETTINGS" -ForegroundColor Green
Write-Host "   • Build Command: npm install"
Write-Host "   • Start Command: npm start"
Write-Host "   • Root Directory: backend"

Write-Host "`n5. 🌐 DOMAIN SETUP" -ForegroundColor Green
Write-Host "   • Railway will provide a URL like: https://app-name.up.railway.app"
Write-Host "   • Copy this URL for frontend configuration"

# Create a simplified server for easier deployment
Write-Host "`n📝 Creating deployment-ready files..." -ForegroundColor Yellow

# Ensure we're in the backend directory
Set-Location -Path "backend" -ErrorAction SilentlyContinue

# Update package.json to ensure correct start script
$packageJsonPath = "package.json"
if (Test-Path $packageJsonPath) {
    $packageJson = Get-Content $packageJsonPath | ConvertFrom-Json
    $packageJson.scripts.start = "node railway-server.js"
    $packageJson | ConvertTo-Json -Depth 10 | Out-File $packageJsonPath -Encoding UTF8
    Write-Host "✅ Updated package.json start script" -ForegroundColor Green
}

# Create .env template for Railway
$envTemplate = @"
# Railway Environment Variables Template
# Copy these to Railway dashboard under Settings > Environment

NODE_ENV=production
JWT_SECRET=railway_production_jwt_secret_12345
CORS_ORIGIN=https://social-media-platform-app.netlify.app

# Optional: MongoDB Atlas connection
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# The following are automatically set by Railway:
# PORT=(auto-assigned)
# RAILWAY_ENVIRONMENT=production
"@

$envTemplate | Out-File -FilePath ".env.railway.template" -Encoding UTF8
Write-Host "✅ Created .env.railway.template" -ForegroundColor Green

# Create Railway deployment README
$deployReadme = @"
# Railway Deployment Instructions

## Quick Deploy Steps:

1. **Push to GitHub:**
   - Commit all changes
   - Push to your GitHub repository

2. **Create Railway Project:**
   - Visit https://railway.app
   - Login with GitHub
   - New Project > Deploy from GitHub repo
   - Select this repository
   - Choose /backend as root directory

3. **Configure Environment:**
   Copy these environment variables to Railway dashboard:
   ```
   NODE_ENV=production
   JWT_SECRET=railway_production_jwt_secret_12345
   CORS_ORIGIN=https://social-media-platform-app.netlify.app
   ```

4. **Deploy:**
   - Railway will automatically build and deploy
   - Get your app URL (e.g., https://yourapp.up.railway.app)

5. **Test:**
   - Visit https://yourapp.up.railway.app/health
   - Should return status 200 with server info

## Current Server Features:
- ✅ Health endpoint (/health, /api/health)
- ✅ Authentication (/api/auth/login, /api/auth/register)
- ✅ Dashboard API (/api/dashboard)
- ✅ User profile (/api/users/profile)
- ✅ CORS configured for Netlify frontend
- ✅ In-memory database fallback (no MongoDB required)
- ✅ JWT token authentication
- ✅ Comprehensive error handling

## Test Credentials:
- Admin: admin@altaro.com / admin123
- User: user@altaro.com / admin123

## Frontend Integration:
Update frontend .env.production:
```
REACT_APP_API_URL=https://yourapp.up.railway.app
```
"@

$deployReadme | Out-File -FilePath "RAILWAY_DEPLOY.md" -Encoding UTF8
Write-Host "✅ Created RAILWAY_DEPLOY.md" -ForegroundColor Green

Write-Host "`n🎉 DEPLOYMENT FILES READY!" -ForegroundColor Green
Write-Host "Files created:" -ForegroundColor Yellow
Write-Host "  • .env.railway.template (environment variables)" -ForegroundColor White
Write-Host "  • RAILWAY_DEPLOY.md (deployment instructions)" -ForegroundColor White
Write-Host "  • Updated package.json (start script)" -ForegroundColor White

Write-Host "`n🔗 IMMEDIATE ALTERNATIVE - Test Current Backend:" -ForegroundColor Yellow
Write-Host "The backend is working locally on port 5000"
Write-Host "You can use this for immediate testing:"
Write-Host "  • Health: http://localhost:5000/health" -ForegroundColor White
Write-Host "  • Login: http://localhost:5000/api/auth/login" -ForegroundColor White

Write-Host "`n🚀 NEXT ACTIONS:" -ForegroundColor Cyan
Write-Host "1. Commit and push changes to GitHub" -ForegroundColor White
Write-Host "2. Deploy to Railway using web dashboard" -ForegroundColor White
Write-Host "3. Update frontend with new backend URL" -ForegroundColor White
Write-Host "4. Test live website functionality" -ForegroundColor White
