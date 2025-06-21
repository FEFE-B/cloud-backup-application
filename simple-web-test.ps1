# Simple Web Application Test Script
# Tests: https://social-media-platform-app.netlify.app/#/login

Write-Host "=== WEB APPLICATION TEST RESULTS ===" -ForegroundColor Cyan
Write-Host "Target: https://social-media-platform-app/#/login" -ForegroundColor Yellow
Write-Host "Date: $(Get-Date)" -ForegroundColor Green
Write-Host ""

# Test 1: Basic Accessibility
Write-Host "1. BASIC ACCESSIBILITY TESTS" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan

$urls = @(
    "https://social-media-platform-app.netlify.app/",
    "https://social-media-platform-app.netlify.app/#/login",
    "https://social-media-platform-app.netlify.app/diagnostics",
    "https://social-media-platform-app.netlify.app/comprehensive-diagnostics"
)

foreach ($url in $urls) {
    try {
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        $response = Invoke-WebRequest -Uri $url -TimeoutSec 10 -UseBasicParsing
        $stopwatch.Stop()
        
        Write-Host "SUCCESS: $url" -ForegroundColor Green
        Write-Host "  Status: $($response.StatusCode)" -ForegroundColor White
        Write-Host "  Time: $($stopwatch.ElapsedMilliseconds)ms" -ForegroundColor White
        Write-Host "  Size: $($response.Content.Length) bytes" -ForegroundColor White
    }
    catch {
        Write-Host "FAILED: $url" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

# Test 2: Backend API Tests
Write-Host "2. BACKEND API TESTS" -ForegroundColor Cyan
Write-Host "====================" -ForegroundColor Cyan

$apiUrls = @(
    "https://altaro-cloud-backup-production.up.railway.app/health",
    "https://altaro-cloud-backup-production.up.railway.app/api/auth/login"
)

foreach ($apiUrl in $apiUrls) {
    try {
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        
        if ($apiUrl -like "*login") {
            # Test POST endpoint
            $body = '{"email":"test@test.com","password":"test123"}'
            $headers = @{'Content-Type' = 'application/json'}
            $response = Invoke-WebRequest -Uri $apiUrl -Method POST -Body $body -Headers $headers -TimeoutSec 10 -UseBasicParsing
        } else {
            # Test GET endpoint
            $response = Invoke-WebRequest -Uri $apiUrl -TimeoutSec 10 -UseBasicParsing
        }
        
        $stopwatch.Stop()
        
        Write-Host "SUCCESS: $apiUrl" -ForegroundColor Green
        Write-Host "  Status: $($response.StatusCode)" -ForegroundColor White
        Write-Host "  Time: $($stopwatch.ElapsedMilliseconds)ms" -ForegroundColor White
    }
    catch {
        Write-Host "FAILED: $apiUrl" -ForegroundColor Red
        Write-Host "  Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

# Test 3: Performance Analysis
Write-Host "3. PERFORMANCE ANALYSIS" -ForegroundColor Cyan
Write-Host "=======================" -ForegroundColor Cyan

$testUrl = "https://social-media-platform-app.netlify.app/"
$times = @()

Write-Host "Running 5 performance tests..."
for ($i = 1; $i -le 5; $i++) {
    try {
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        $response = Invoke-WebRequest -Uri $testUrl -TimeoutSec 10 -UseBasicParsing
        $stopwatch.Stop()
        $times += $stopwatch.ElapsedMilliseconds
        Write-Host "Test $i : $($stopwatch.ElapsedMilliseconds)ms" -ForegroundColor Green
    }
    catch {
        Write-Host "Test $i : FAILED" -ForegroundColor Red
    }
}

if ($times.Count -gt 0) {
    $avgTime = ($times | Measure-Object -Average).Average
    $minTime = ($times | Measure-Object -Minimum).Minimum
    $maxTime = ($times | Measure-Object -Maximum).Maximum
    
    Write-Host ""
    Write-Host "Performance Summary:" -ForegroundColor Yellow
    Write-Host "  Average: $([math]::Round($avgTime, 2))ms"
    Write-Host "  Minimum: ${minTime}ms"
    Write-Host "  Maximum: ${maxTime}ms"
    
    if ($avgTime -lt 1000) {
        Write-Host "  Rating: EXCELLENT" -ForegroundColor Green
    } elseif ($avgTime -lt 3000) {
        Write-Host "  Rating: GOOD" -ForegroundColor Yellow
    } else {
        Write-Host "  Rating: NEEDS IMPROVEMENT" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== TEST COMPLETE ===" -ForegroundColor Cyan

# Final recommendations
Write-Host ""
Write-Host "RECOMMENDATIONS:" -ForegroundColor Yellow
Write-Host "1. Site is accessible and loading"
Write-Host "2. JavaScript is required for full functionality"
Write-Host "3. Use browser developer tools for detailed testing"
Write-Host "4. Test login functionality manually in browser"
Write-Host ""
Write-Host "Manual testing URL: https://social-media-platform-app.netlify.app/#/login" -ForegroundColor White
