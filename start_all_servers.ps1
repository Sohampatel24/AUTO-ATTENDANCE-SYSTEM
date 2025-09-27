# PowerShell script to start all servers
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "   Starting All Servers" -ForegroundColor Cyan  
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = "D:\Soham\HACKATHONS\SIH 2025\New Model - Copy\SIH-INITIAL - Manan - Copy"
$pipelinePath = "$projectRoot\pipeline"
$backendPath = "$projectRoot\backend-node"

# Start MongoDB if not running
Write-Host "Starting MongoDB (if not already running)..." -ForegroundColor Yellow
try {
    Start-Service -Name "MongoDB" -ErrorAction SilentlyContinue
    Write-Host "MongoDB service started or already running" -ForegroundColor Green
} catch {
    Write-Host "MongoDB service not found or already running" -ForegroundColor Orange
}

Write-Host ""
Write-Host "Starting Pipeline API Server (Port 5000)..." -ForegroundColor Yellow

# Start Pipeline API Server
$pipelineJob = Start-Job -ScriptBlock {
    param($path)
    Set-Location $path
    python api_server.py
} -ArgumentList $pipelinePath

Write-Host "Pipeline API Server started in background job" -ForegroundColor Green

Write-Host ""
Write-Host "Waiting 5 seconds for Pipeline API to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "Starting Backend Node.js Server (Port 3000)..." -ForegroundColor Yellow

# Start Backend Node Server  
$backendJob = Start-Job -ScriptBlock {
    param($path) 
    Set-Location $path
    node server.js
} -ArgumentList $backendPath

Write-Host "Backend Node Server started in background job" -ForegroundColor Green

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "   All Servers Started!" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pipeline API Server: http://localhost:5000" -ForegroundColor Green
Write-Host "Backend Node Server: http://localhost:3000" -ForegroundColor Green
Write-Host ""

# Wait a bit more for servers to fully start
Write-Host "Waiting 10 seconds for servers to fully initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "Testing server connectivity..." -ForegroundColor Yellow
Write-Host ""

# Test Pipeline API
Write-Host "Testing Pipeline API Health..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/health" -Method Get -TimeoutSec 10
    Write-Host "✅ Pipeline API Status: $($response.status)" -ForegroundColor Green
    Write-Host "   Service: $($response.service)" -ForegroundColor Green
} catch {
    Write-Host "❌ Pipeline API not responding: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test Backend Node Server
Write-Host "Testing Backend Node Server..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method Get -TimeoutSec 10
    if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 302) {
        Write-Host "✅ Backend Node Server is responding (Status: $($response.StatusCode))" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Backend Node Server responded with status: $($response.StatusCode)" -ForegroundColor Orange
    }
} catch {
    Write-Host "❌ Backend Node Server not responding: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "   Integration Test Complete" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🚀 You can now access the web interface at:" -ForegroundColor Green
Write-Host "   http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Server Status:" -ForegroundColor Yellow
Write-Host "   Pipeline API Job ID: $($pipelineJob.Id)" -ForegroundColor Gray
Write-Host "   Backend Node Job ID: $($backendJob.Id)" -ForegroundColor Gray
Write-Host ""
Write-Host "To stop all servers, run:" -ForegroundColor Yellow
Write-Host "   Stop-Job -Id $($pipelineJob.Id), $($backendJob.Id)" -ForegroundColor Gray
Write-Host "   Remove-Job -Id $($pipelineJob.Id), $($backendJob.Id)" -ForegroundColor Gray
Write-Host ""

# Keep script running to monitor jobs
Write-Host "Press Ctrl+C to stop monitoring (servers will keep running in background)" -ForegroundColor Yellow
Write-Host "Press 'q' and Enter to stop all servers and exit" -ForegroundColor Yellow
Write-Host ""

# Monitor loop
do {
    $key = Read-Host "Enter 'q' to quit or 'status' to check server status"
    if ($key -eq "status") {
        Write-Host ""
        Write-Host "Server Status Check:" -ForegroundColor Yellow
        
        # Check Pipeline API
        try {
            $response = Invoke-RestMethod -Uri "http://localhost:5000/health" -Method Get -TimeoutSec 5
            Write-Host "✅ Pipeline API: Running ($($response.status))" -ForegroundColor Green
        } catch {
            Write-Host "❌ Pipeline API: Not responding" -ForegroundColor Red
        }
        
        # Check Backend Node
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method Get -TimeoutSec 5
            Write-Host "✅ Backend Node: Running (Status: $($response.StatusCode))" -ForegroundColor Green
        } catch {
            Write-Host "❌ Backend Node: Not responding" -ForegroundColor Red
        }
        Write-Host ""
    }
} while ($key -ne "q")

# Stop all jobs
Write-Host ""
Write-Host "Stopping all servers..." -ForegroundColor Yellow
Stop-Job -Id $pipelineJob.Id, $backendJob.Id -ErrorAction SilentlyContinue
Remove-Job -Id $pipelineJob.Id, $backendJob.Id -ErrorAction SilentlyContinue
Write-Host "All servers stopped." -ForegroundColor Green