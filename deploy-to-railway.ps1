# Railway Deployment Script for Altaro Cloud Backup Backend
# This script prepares and deploys the backend to Railway

Write-Host "🚀 RAILWAY DEPLOYMENT SCRIPT" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan

# Check if Railway CLI is installed
Write-Host "`n📋 Checking Railway CLI..." -ForegroundColor Yellow
try {
    $railwayVersion = railway --version 2>$null
    if ($railwayVersion) {
        Write-Host "✅ Railway CLI found: $railwayVersion" -ForegroundColor Green
    } else {
        throw "Railway CLI not found"
    }
} catch {
    Write-Host "❌ Railway CLI not installed" -ForegroundColor Red
    Write-Host "💡 Install Railway CLI:" -ForegroundColor Yellow
    Write-Host "   npm install -g @railway/cli" -ForegroundColor White
    Write-Host "   or download from: https://railway.app/cli" -ForegroundColor White
    exit 1
}

# Check if user is logged in to Railway
Write-Host "`n🔐 Checking Railway authentication..." -ForegroundColor Yellow
try {
    $authStatus = railway auth 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Railway authentication verified" -ForegroundColor Green
    } else {
        throw "Not authenticated"
    }
} catch {
    Write-Host "❌ Not logged in to Railway" -ForegroundColor Red
    Write-Host "💡 Login to Railway:" -ForegroundColor Yellow
    Write-Host "   railway login" -ForegroundColor White
    exit 1
}

# Prepare deployment files
Write-Host "`n📦 Preparing deployment files..." -ForegroundColor Yellow

# Ensure we're in the backend directory
Set-Location -Path "backend" -ErrorAction SilentlyContinue

# Check if package.json exists
if (!(Test-Path "package.json")) {
    Write-Host "❌ package.json not found" -ForegroundColor Red
    exit 1
}

# Create or update .railwayignore
$railwayIgnore = @"
node_modules/
.env
.env.local
.env.development
*.log
npm-debug.log*
coverage/
.nyc_output/
tests/
test-*.js
*.test.js
*.spec.js
"@

$railwayIgnore | Out-File -FilePath ".railwayignore" -Encoding UTF8
Write-Host "✅ Created .railwayignore" -ForegroundColor Green

# Create Procfile for Railway
$procfile = "web: npm start"
$procfile | Out-File -FilePath "Procfile" -Encoding UTF8 -NoNewline
Write-Host "✅ Created Procfile" -ForegroundColor Green

# Display current configuration
Write-Host "`n📊 Deployment Configuration:" -ForegroundColor Yellow
Write-Host "   Start Command: npm start" -ForegroundColor White
Write-Host "   Main File: railway-server.js" -ForegroundColor White
Write-Host "   Port: process.env.PORT || 5000" -ForegroundColor White

# Check for existing Railway project
Write-Host "`n🔍 Checking Railway project..." -ForegroundColor Yellow
try {
    $projectInfo = railway status 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Railway project detected" -ForegroundColor Green
        Write-Host $projectInfo
    } else {
        Write-Host "⚠️ No Railway project found" -ForegroundColor Yellow
        Write-Host "💡 Initialize Railway project:" -ForegroundColor Yellow
        Write-Host "   railway init" -ForegroundColor White
        
        # Ask user if they want to initialize
        $response = Read-Host "Initialize Railway project now? (y/n)"
        if ($response -eq 'y') {
            Write-Host "🔧 Initializing Railway project..." -ForegroundColor Yellow
            railway init
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Railway project initialized" -ForegroundColor Green
            } else {
                Write-Host "❌ Failed to initialize Railway project" -ForegroundColor Red
                exit 1
            }
        }
    }
} catch {
    Write-Host "❌ Error checking Railway project status" -ForegroundColor Red
}

# Set environment variables
Write-Host "`n🔧 Setting up environment variables..." -ForegroundColor Yellow

$envVars = @{
    "NODE_ENV" = "production"
    "JWT_SECRET" = "railway_production_jwt_secret_$(Get-Random -Maximum 99999)"
    "CORS_ORIGIN" = "https://social-media-platform-app.netlify.app"
}

foreach ($var in $envVars.GetEnumerator()) {
    try {
        railway variables set "$($var.Key)=$($var.Value)"
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Set $($var.Key)" -ForegroundColor Green
        } else {
            Write-Host "⚠️ Warning: Could not set $($var.Key)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠️ Warning: Could not set $($var.Key)" -ForegroundColor Yellow
    }
}

# Deploy to Railway
Write-Host "`n🚀 Deploying to Railway..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..." -ForegroundColor White

try {
    railway up
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Deployment successful!" -ForegroundColor Green
        
        # Get deployment URL
        Write-Host "`n🌐 Getting deployment URL..." -ForegroundColor Yellow
        $url = railway status --json | ConvertFrom-Json | Select-Object -ExpandProperty url
        if ($url) {
            Write-Host "✅ Deployment URL: $url" -ForegroundColor Green
            
            # Test the deployed health endpoint
            Write-Host "`n🏥 Testing deployed health endpoint..." -ForegroundColor Yellow
            try {
                $response = Invoke-WebRequest -Uri "$url/health" -TimeoutSec 30
                if ($response.StatusCode -eq 200) {
                    Write-Host "✅ Health check passed!" -ForegroundColor Green
                    $healthData = $response.Content | ConvertFrom-Json
                    Write-Host "   Status: $($healthData.status)" -ForegroundColor White
                    Write-Host "   Database: $($healthData.mongodb)" -ForegroundColor White
                } else {
                    Write-Host "⚠️ Health check returned status: $($response.StatusCode)" -ForegroundColor Yellow
                }
            } catch {
                Write-Host "⚠️ Could not reach health endpoint (may still be starting)" -ForegroundColor Yellow
            }
            
        } else {
            Write-Host "⚠️ Could not get deployment URL" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Deployment failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Deployment error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n🎉 DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green

Write-Host "`n📋 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Test the live API endpoints" -ForegroundColor White
Write-Host "2. Update frontend to use new backend URL" -ForegroundColor White
Write-Host "3. Test login functionality on live site" -ForegroundColor White
Write-Host "4. Set up MongoDB Atlas if needed" -ForegroundColor White

Write-Host "`n🔗 Useful Commands:" -ForegroundColor Yellow
Write-Host "   railway logs      - View deployment logs" -ForegroundColor White
Write-Host "   railway status    - Check deployment status" -ForegroundColor White
Write-Host "   railway open      - Open app in browser" -ForegroundColor White

Write-Host "`nDeployment completed at: $(Get-Date)" -ForegroundColor Cyan
