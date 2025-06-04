# Start servers for Cloud Backup Software
# This script starts both the backend and frontend servers

# Define paths
$backendPath = "c:\Users\OFENTSE\Documents\cloud backup software\backend"
$frontendPath = "c:\Users\OFENTSE\Documents\cloud backup software\frontend"

Write-Host "Starting servers for Cloud Backup Software" -ForegroundColor Green

# Start the backend server in a new PowerShell window
Write-Host "Starting backend server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-Command", "Set-Location '$backendPath'; npm start"

# Start the simple server for fallback in a new PowerShell window
Write-Host "Starting simple-server for fallback..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-Command", "Set-Location '$backendPath'; node simple-server.js"

# Wait a moment for the backend to initialize
Start-Sleep -Seconds 3

# Start the frontend server in a new PowerShell window
Write-Host "Starting frontend server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-Command", "Set-Location '$frontendPath'; npm start"

Write-Host "All servers started!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Backend API: http://localhost:5000" -ForegroundColor Cyan
Write-Host "Simple Server: http://localhost:3030" -ForegroundColor Cyan
Write-Host "Press any key to exit this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
