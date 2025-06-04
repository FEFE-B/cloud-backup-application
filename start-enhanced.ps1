# Enhanced startup script for Cloud Backup Application
# This script starts all servers with improved monitoring and error handling

param(
    [switch]$TestOnly,
    [switch]$Verbose
)

# Set error action preference
$ErrorActionPreference = "Continue"

# Define paths
$rootPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $rootPath "backend"
$frontendPath = Join-Path $rootPath "frontend"

# Define colors for output
$colors = @{
    Success = 'Green'
    Warning = 'Yellow'
    Error = 'Red'
    Info = 'Cyan'
    Header = 'Magenta'
}

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = 'White'
    )
    Write-Host $Message -ForegroundColor $colors[$Color]
}

function Test-Port {
    param(
        [int]$Port,
        [string]$ServiceName
    )
    
    try {
        $connection = Test-NetConnection -ComputerName "localhost" -Port $Port -WarningAction SilentlyContinue
        if ($connection.TcpTestSucceeded) {
            Write-ColorOutput "✅ $ServiceName (port $Port) is running" 'Success'
            return $true
        } else {
            Write-ColorOutput "❌ $ServiceName (port $Port) is not responding" 'Error'
            return $false
        }
    } catch {
        Write-ColorOutput "❌ $ServiceName (port $Port) is not accessible" 'Error'
        return $false
    }
}

function Start-BackendServer {
    Write-ColorOutput "🚀 Starting backend server (port 5000)..." 'Info'
    
    # Check if already running
    if (Test-Port -Port 5000 -ServiceName "Backend Server") {
        Write-ColorOutput "Backend server is already running" 'Warning'
        return
    }
    
    # Start backend server
    try {
        Start-Process powershell -ArgumentList "-Command", "Set-Location '$backendPath'; Write-Host 'Starting backend server...' -ForegroundColor Green; npm start" -WindowStyle Normal
        Start-Sleep -Seconds 3
        
        if (Test-Port -Port 5000 -ServiceName "Backend Server") {
            Write-ColorOutput "Backend server started successfully" 'Success'
        } else {
            Write-ColorOutput "Failed to start backend server" 'Error'
        }
    } catch {
        Write-ColorOutput "Error starting backend server: $($_.Exception.Message)" 'Error'
    }
}

function Start-SimpleServer {
    Write-ColorOutput "🔧 Starting simple server (port 3030)..." 'Info'
    
    # Check if already running
    if (Test-Port -Port 3030 -ServiceName "Simple Server") {
        Write-ColorOutput "Simple server is already running" 'Warning'
        return
    }
    
    # Start simple server
    try {
        Start-Process powershell -ArgumentList "-Command", "Set-Location '$backendPath'; Write-Host 'Starting simple server...' -ForegroundColor Yellow; node simple-server.js" -WindowStyle Normal
        Start-Sleep -Seconds 2
        
        if (Test-Port -Port 3030 -ServiceName "Simple Server") {
            Write-ColorOutput "Simple server started successfully" 'Success'
        } else {
            Write-ColorOutput "Failed to start simple server" 'Error'
        }
    } catch {
        Write-ColorOutput "Error starting simple server: $($_.Exception.Message)" 'Error'
    }
}

function Start-FrontendServer {
    Write-ColorOutput "🌐 Starting frontend server (port 3000)..." 'Info'
    
    # Check if already running
    if (Test-Port -Port 3000 -ServiceName "Frontend Server") {
        Write-ColorOutput "Frontend server is already running" 'Warning'
        return
    }
    
    # Start frontend server
    try {
        Start-Process powershell -ArgumentList "-Command", "Set-Location '$frontendPath'; Write-Host 'Starting frontend server...' -ForegroundColor Cyan; npm start" -WindowStyle Normal
        Start-Sleep -Seconds 5
        
        if (Test-Port -Port 3000 -ServiceName "Frontend Server") {
            Write-ColorOutput "Frontend server started successfully" 'Success'
        } else {
            Write-ColorOutput "Failed to start frontend server" 'Error'
        }
    } catch {
        Write-ColorOutput "Error starting frontend server: $($_.Exception.Message)" 'Error'
    }
}

function Test-LoginFlow {
    Write-ColorOutput "🧪 Testing login flow..." 'Info'
    
    try {
        $testScript = Join-Path $rootPath "test-login-flow.js"
        if (Test-Path $testScript) {
            node $testScript
        } else {
            Write-ColorOutput "Test script not found at $testScript" 'Warning'
        }
    } catch {
        Write-ColorOutput "Error running login flow test: $($_.Exception.Message)" 'Error'
    }
}

function Show-ApplicationStatus {
    Write-ColorOutput "`n📊 Application Status:" 'Header'
    Write-ColorOutput "===================" 'Header'
    
    $backendRunning = Test-Port -Port 5000 -ServiceName "Backend API"
    $simpleRunning = Test-Port -Port 3030 -ServiceName "Simple Server"
    $frontendRunning = Test-Port -Port 3000 -ServiceName "Frontend"
    
    Write-ColorOutput "`n🌐 Access URLs:" 'Info'
    if ($frontendRunning) {
        Write-ColorOutput "   Frontend: http://localhost:3000" 'Success'
        Write-ColorOutput "   Login Page: http://localhost:3000/login" 'Success'
    }
    if ($backendRunning) {
        Write-ColorOutput "   Backend API: http://localhost:5000" 'Success'
    }
    if ($simpleRunning) {
        Write-ColorOutput "   Simple Server: http://localhost:3030" 'Success'
    }
    
    Write-ColorOutput "`n🔑 Test Credentials:" 'Info'
    Write-ColorOutput "   Admin: admin@altaro.com / admin123" 'Info'
    Write-ColorOutput "   User: user@altaro.com / admin123" 'Info'
    
    if ($backendRunning -or $simpleRunning) {
        Write-ColorOutput "`n✅ Login functionality should be working!" 'Success'
    } else {
        Write-ColorOutput "`n⚠️  No backend servers are running. Login will not work." 'Warning'
    }
}

# Main execution
Write-ColorOutput "🚀 Cloud Backup Application Startup" 'Header'
Write-ColorOutput "===================================" 'Header'

if ($TestOnly) {
    Write-ColorOutput "Running in test-only mode..." 'Info'
    Show-ApplicationStatus
    Test-LoginFlow
    exit
}

# Check prerequisites
Write-ColorOutput "`n🔍 Checking prerequisites..." 'Info'

if (-not (Test-Path $backendPath)) {
    Write-ColorOutput "Backend directory not found: $backendPath" 'Error'
    exit 1
}

if (-not (Test-Path $frontendPath)) {
    Write-ColorOutput "Frontend directory not found: $frontendPath" 'Error'
    exit 1
}

# Start servers
Write-ColorOutput "`n🚀 Starting all servers..." 'Info'

Start-BackendServer
Start-SimpleServer
Start-FrontendServer

# Wait for all servers to be ready
Write-ColorOutput "`n⏳ Waiting for servers to initialize..." 'Info'
Start-Sleep -Seconds 5

# Show final status
Show-ApplicationStatus

# Run tests if verbose mode
if ($Verbose) {
    Test-LoginFlow
}

Write-ColorOutput "`n🎉 Startup complete! Press any key to exit this window..." 'Success'
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
