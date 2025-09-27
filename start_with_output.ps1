# PowerShell script to start servers with visible output
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "   Starting All Servers with Output" -ForegroundColor Cyan  
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = "D:\Soham\HACKATHONS\SIH 2025\New Model - Copy\SIH-INITIAL - Manan - Copy"
$pipelinePath = "$projectRoot\pipeline"
$backendPath = "$projectRoot\backend-node"

Write-Host "🔍 Testing Python and Node.js availability..." -ForegroundColor Yellow

# Test Python
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python not found in PATH" -ForegroundColor Red
    exit 1
}

# Test Node.js
try {
    $nodeVersion = node --version 2>&1
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found in PATH" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🚀 Starting Pipeline API Server..." -ForegroundColor Yellow
Write-Host "Directory: $pipelinePath" -ForegroundColor Gray

# Change to pipeline directory and start server
Set-Location $pipelinePath

# Test if api_server.py exists
if (-not (Test-Path "api_server.py")) {
    Write-Host "❌ api_server.py not found in $pipelinePath" -ForegroundColor Red
    exit 1
}

Write-Host "📄 Found api_server.py, starting..." -ForegroundColor Green

# Start pipeline server in background but capture output
$pipelineProcess = Start-Process python -ArgumentList "api_server.py" -PassThru -WindowStyle Hidden

Write-Host "Pipeline API Server started with PID: $($pipelineProcess.Id)" -ForegroundColor Green

Write-Host ""
Write-Host "⏳ Waiting 8 seconds for Pipeline API to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

# Test Pipeline API
Write-Host "🧪 Testing Pipeline API..." -ForegroundColor Yellow
$pipelineWorking = $false
for ($i = 1; $i -le 3; $i++) {
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:5000/health" -Method Get -TimeoutSec 5
        Write-Host "✅ Pipeline API is working! Status: $($response.status)" -ForegroundColor Green
        $pipelineWorking = $true
        break
    } catch {
        Write-Host "⏳ Attempt $i/3: Pipeline API not ready yet..." -ForegroundColor Orange
        Start-Sleep -Seconds 3
    }
}

if (-not $pipelineWorking) {
    Write-Host "❌ Pipeline API failed to start properly" -ForegroundColor Red
    Write-Host "Stopping pipeline process..." -ForegroundColor Yellow
    Stop-Process -Id $pipelineProcess.Id -Force -ErrorAction SilentlyContinue
    exit 1
}

Write-Host ""
Write-Host "🚀 Starting Backend Node.js Server..." -ForegroundColor Yellow
Write-Host "Directory: $backendPath" -ForegroundColor Gray

# Change to backend directory
Set-Location $backendPath

# Test if server.js exists
if (-not (Test-Path "server.js")) {
    Write-Host "❌ server.js not found in $backendPath" -ForegroundColor Red
    Stop-Process -Id $pipelineProcess.Id -Force -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "📄 Found server.js, starting..." -ForegroundColor Green

# Start backend server
$backendProcess = Start-Process node -ArgumentList "server.js" -PassThru -WindowStyle Hidden

Write-Host "Backend Node Server started with PID: $($backendProcess.Id)" -ForegroundColor Green

Write-Host ""
Write-Host "⏳ Waiting 8 seconds for Backend Node to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

# Test Backend Node
Write-Host "🧪 Testing Backend Node Server..." -ForegroundColor Yellow
$backendWorking = $false
for ($i = 1; $i -le 3; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method Get -TimeoutSec 5
        if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 302) {
            Write-Host "✅ Backend Node Server is working! Status: $($response.StatusCode)" -ForegroundColor Green
            $backendWorking = $true
            break
        }
    } catch {
        Write-Host "⏳ Attempt $i/3: Backend Node not ready yet..." -ForegroundColor Orange
        Start-Sleep -Seconds 3
    }
}

if (-not $backendWorking) {
    Write-Host "❌ Backend Node Server failed to start properly" -ForegroundColor Red
    Write-Host "Stopping all processes..." -ForegroundColor Yellow
    Stop-Process -Id $pipelineProcess.Id, $backendProcess.Id -Force -ErrorAction SilentlyContinue
    exit 1
}

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "   🎉 ALL SERVERS RUNNING!" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 Web Interface: http://localhost:3000" -ForegroundColor Green
Write-Host "🔌 Pipeline API:  http://localhost:5000" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Process IDs:" -ForegroundColor Yellow
Write-Host "   Pipeline API: $($pipelineProcess.Id)" -ForegroundColor Gray
Write-Host "   Backend Node: $($backendProcess.Id)" -ForegroundColor Gray
Write-Host ""
Write-Host "🔧 Integration Status:" -ForegroundColor Yellow
Write-Host "   ✅ Backend-node is now using PIPELINE model (port 5000)" -ForegroundColor Green
Write-Host "   ✅ No longer using ml-service (ports 5001, 5002, 5003)" -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to stop all servers..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Write-Host ""
Write-Host "Stopping all servers..." -ForegroundColor Yellow
Stop-Process -Id $pipelineProcess.Id, $backendProcess.Id -Force -ErrorAction SilentlyContinue
Write-Host "All servers stopped." -ForegroundColor Green