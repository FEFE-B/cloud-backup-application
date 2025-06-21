# Comprehensive Web Page Validation Script
# Tests both frontend and backend functionality

Write-Host "🚀 COMPREHENSIVE WEB PAGE VALIDATION" -ForegroundColor Cyan
Write-Host "=" * 50

# Test 1: Frontend Netlify Application
Write-Host "`n📱 FRONTEND VALIDATION (Netlify)" -ForegroundColor Yellow
Write-Host "-" * 30

$frontendUrl = "https://social-media-platform-app.netlify.app"
$frontendStartTime = Get-Date

try {
    $frontendResponse = Invoke-WebRequest -Uri $frontendUrl -TimeoutSec 15
    $frontendEndTime = Get-Date
    $frontendResponseTime = ($frontendEndTime - $frontendStartTime).TotalMilliseconds
    
    Write-Host "✅ Status Code: $($frontendResponse.StatusCode)" -ForegroundColor Green
    Write-Host "⏱️  Response Time: ${frontendResponseTime}ms"
    Write-Host "📄 Content Length: $($frontendResponse.Content.Length) characters"
    Write-Host "🌐 Content Type: $($frontendResponse.Headers['Content-Type'])"
    
    # Performance check
    if ($frontendResponseTime -lt 2000) {
        Write-Host "🚀 Performance: EXCELLENT (<2s)" -ForegroundColor Green
    } elseif ($frontendResponseTime -lt 5000) {
        Write-Host "⚠️  Performance: ACCEPTABLE (2-5s)" -ForegroundColor Yellow
    } else {
        Write-Host "🐌 Performance: SLOW (>5s)" -ForegroundColor Red
    }
    
    # Content validation
    if ($frontendResponse.Content -match "<!DOCTYPE html>") {
        Write-Host "📋 HTML Structure: VALID" -ForegroundColor Green
    } else {
        Write-Host "📋 HTML Structure: INVALID" -ForegroundColor Red
    }
    
    # Check for React app
    if ($frontendResponse.Content -match "react|React") {
        Write-Host "⚛️  React Framework: DETECTED" -ForegroundColor Green
    }
    
} catch {
    Write-Host "❌ Frontend Test FAILED" -ForegroundColor Red
    Write-Host "🚨 Error: $($_.Exception.Message)"
}

# Test 2: Backend Railway API
Write-Host "`n🔧 BACKEND API VALIDATION (Railway)" -ForegroundColor Yellow
Write-Host "-" * 35

$backendHealthUrl = "https://altaro-cloud-backup-production.up.railway.app/api/health"
$backendStartTime = Get-Date

try {
    $healthResponse = Invoke-RestMethod -Uri $backendHealthUrl -TimeoutSec 10
    $backendEndTime = Get-Date
    $backendResponseTime = ($backendEndTime - $backendStartTime).TotalMilliseconds
    
    Write-Host "✅ Health Endpoint: ONLINE" -ForegroundColor Green
    Write-Host "⏱️  Response Time: ${backendResponseTime}ms"
    Write-Host "📊 Server Status: $($healthResponse.status)"
    Write-Host "🗄️  Database: $($healthResponse.mongodb)"
    Write-Host "⏰ Uptime: $([math]::Round($healthResponse.uptime / 3600, 2)) hours"
    
    # Database status check
    if ($healthResponse.mongodb -eq "Connected") {
        Write-Host "💾 Database Status: HEALTHY" -ForegroundColor Green
    } else {
        Write-Host "💾 Database Status: UNHEALTHY" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Backend Health Test FAILED" -ForegroundColor Red
    Write-Host "🚨 Error: $($_.Exception.Message)"
}

# Test 3: Login Functionality (Critical Test)
Write-Host "`n🔐 AUTHENTICATION VALIDATION" -ForegroundColor Yellow
Write-Host "-" * 25

$loginUrl = "https://altaro-cloud-backup-production.up.railway.app/api/auth/login"
$loginBody = @{
    email = "admin@altaro.com"
    password = "admin123"
} | ConvertTo-Json

$loginStartTime = Get-Date

try {
    $loginResponse = Invoke-RestMethod -Uri $loginUrl -Method POST -Body $loginBody -ContentType "application/json" -TimeoutSec 10
    $loginEndTime = Get-Date
    $loginResponseTime = ($loginEndTime - $loginStartTime).TotalMilliseconds
    
    Write-Host "✅ Login Status: SUCCESS" -ForegroundColor Green
    Write-Host "⏱️  Response Time: ${loginResponseTime}ms"
    Write-Host "🎫 Token Generated: YES"
    Write-Host "🔑 Token Preview: $($loginResponse.token.Substring(0,30))..."
    Write-Host "✓ Authentication: WORKING" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Login Test FAILED" -ForegroundColor Red
    Write-Host "🚨 Error: $($_.Exception.Message)"
    
    # Check if it's a 500 error (the issue we were fixing)
    if ($_.Exception.Response.StatusCode -eq 500) {
        Write-Host "🔴 STATUS 500: MongoDB Connection Issue (NEEDS FIX)" -ForegroundColor Red
    }
}

# Test 4: User Login Test
Write-Host "`n👤 USER LOGIN VALIDATION" -ForegroundColor Yellow
Write-Host "-" * 20

$userLoginBody = @{
    email = "user@altaro.com"
    password = "admin123"
} | ConvertTo-Json

try {
    $userLoginResponse = Invoke-RestMethod -Uri $loginUrl -Method POST -Body $userLoginBody -ContentType "application/json" -TimeoutSec 10
    Write-Host "✅ User Login: SUCCESS" -ForegroundColor Green
    Write-Host "🎫 User Token: Generated"
    
} catch {
    Write-Host "❌ User Login: FAILED" -ForegroundColor Red
    Write-Host "🚨 Error: $($_.Exception.Message)"
}

# Test 5: CORS Validation
Write-Host "`n🌐 CORS VALIDATION" -ForegroundColor Yellow
Write-Host "-" * 15

try {
    $corsHeaders = @{
        'Origin' = 'https://social-media-platform-app.netlify.app'
    }
    $corsResponse = Invoke-WebRequest -Uri $backendHealthUrl -Headers $corsHeaders -TimeoutSec 5
    
    if ($corsResponse.Headers['Access-Control-Allow-Origin']) {
        Write-Host "✅ CORS: CONFIGURED" -ForegroundColor Green
        Write-Host "🎯 Allowed Origin: $($corsResponse.Headers['Access-Control-Allow-Origin'])"
    } else {
        Write-Host "⚠️  CORS: NOT DETECTED" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ CORS Test: FAILED" -ForegroundColor Red
    Write-Host "🚨 Error: $($_.Exception.Message)"
}

# Summary
Write-Host "`n📊 VALIDATION SUMMARY" -ForegroundColor Cyan
Write-Host "=" * 20
Write-Host "Frontend (Netlify): $(if ($frontendResponse.StatusCode -eq 200) { '✅ WORKING' } else { '❌ FAILED' })"
Write-Host "Backend Health: $(if ($healthResponse.success) { '✅ WORKING' } else { '❌ FAILED' })"
Write-Host "Database: $(if ($healthResponse.mongodb -eq 'Connected') { '✅ CONNECTED' } else { '❌ DISCONNECTED' })"
Write-Host "Admin Login: $(if ($loginResponse.success) { '✅ WORKING' } else { '❌ FAILED' })"

Write-Host "`n🎯 OVERALL STATUS: $(if ($frontendResponse.StatusCode -eq 200 -and $healthResponse.success -and $loginResponse.success) { '✅ ALL SYSTEMS OPERATIONAL' } else { '⚠️  SOME ISSUES DETECTED' })" -ForegroundColor $(if ($frontendResponse.StatusCode -eq 200 -and $healthResponse.success -and $loginResponse.success) { 'Green' } else { 'Yellow' })

Write-Host "`n🔗 APPLICATION URLS:"
Write-Host "   Frontend: https://social-media-platform-app.netlify.app"
Write-Host "   Backend:  https://altaro-cloud-backup-production.up.railway.app"

Write-Host "`n✅ VALIDATION COMPLETE" -ForegroundColor Green
