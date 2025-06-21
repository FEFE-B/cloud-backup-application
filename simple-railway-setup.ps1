Write-Host "Railway Deployment Setup" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan

Set-Location -Path "backend" -ErrorAction SilentlyContinue

# Update package.json
$packageJsonPath = "package.json"
if (Test-Path $packageJsonPath) {
    $packageJson = Get-Content $packageJsonPath | ConvertFrom-Json
    $packageJson.scripts.start = "node railway-server.js"
    $packageJson | ConvertTo-Json -Depth 10 | Out-File $packageJsonPath -Encoding UTF8
    Write-Host "Updated package.json start script" -ForegroundColor Green
}

# Create environment template
$envTemplate = "NODE_ENV=production`nJWT_SECRET=railway_production_jwt_secret_12345`nCORS_ORIGIN=https://social-media-platform-app.netlify.app"
$envTemplate | Out-File -FilePath ".env.railway.template" -Encoding UTF8
Write-Host "Created .env.railway.template" -ForegroundColor Green

Write-Host "`nFiles ready for Railway deployment!" -ForegroundColor Green
Write-Host "Next: Deploy via Railway web dashboard" -ForegroundColor Yellow
