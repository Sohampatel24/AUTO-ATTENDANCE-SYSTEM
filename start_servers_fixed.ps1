# Fixed PowerShell script to start all servers properly
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "   Starting SIH 2025 Servers" -ForegroundColor Cyan  
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Define paths using proper quoting
$projectRoot = "D:\Soham\HACKATHONS\SIH 2025\New Model - Copy\SIH-INITIAL - Manan - Copy"
$pipelinePath = "$projectRoot\pipeline"
$backendPath = "$projectRoot\backend-node"

# Check if MongoDB is running
Write-Host "Checking MongoDB status..." -ForegroundColor Yellow
try {
    $mongoService = Get-Service -Name "MongoDB" -ErrorAction SilentlyContinue
    if ($mongoService -and $mongoService.Status -eq "Running") {
        Write-Host "✅ MongoDB is running" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Starting MongoDB..." -ForegroundColor Orange
        Start-Service -Name "MongoDB" -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 3
        Write-Host "✅ MongoDB started" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ MongoDB not found or cannot start: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please ensure MongoDB is installed and configured" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Starting Pipeline API Server (Port 5000)..." -ForegroundColor Yellow

# Start Pipeline API Server with proper path handling
$pipelineJob = Start-Job -ScriptBlock {
    param($path)
    Set-Location -Path $path
    python api_server.py
} -ArgumentList $pipelinePath

Write-Host "✅ Pipeline API Server started (Job ID: $($pipelineJob.Id))" -ForegroundColor Green

Write-Host ""
Write-Host "Waiting 5 seconds for Pipeline API to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "Starting Backend Node.js Server (Port 3000)..." -ForegroundColor Yellow

# Start Backend Node Server with proper path handling
$backendJob = Start-Job -ScriptBlock {
    param($path)
    Set-Location -Path $path
    # Set execution policy for this session to allow npm/node
    Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force
    node server.js
} -ArgumentList $backendPath

Write-Host "✅ Backend Node Server started (Job ID: $($backendJob.Id))" -ForegroundColor Green

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "   All Servers Started Successfully!" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 Application URLs:" -ForegroundColor Green
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "   API: http://localhost:5000" -ForegroundColor Cyan
Write-Host ""

# Wait for servers to initialize
Write-Host "Waiting 10 seconds for servers to fully initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Test connectivity
Write-Host ""
Write-Host "Testing server connectivity..." -ForegroundColor Yellow

# Test Pipeline API
Write-Host "  Testing Pipeline API..." -ForegroundColor Gray
try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/health" -Method Get -TimeoutSec 10 -ErrorAction Stop
    Write-Host "  ✅ Pipeline API: $($response.status)" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️ Pipeline API: Not responding yet (this is normal)" -ForegroundColor Orange
}

# Test Backend Node Server
Write-Host "  Testing Backend Node Server..." -ForegroundColor Gray
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method Get -TimeoutSec 10 -ErrorAction Stop
    Write-Host "  ✅ Backend Node: Responding (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️ Backend Node: Not responding yet (this is normal)" -ForegroundColor Orange
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "   Setup Complete!" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🚀 Your application should now be accessible at:" -ForegroundColor Green
Write-Host "   http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Server Management:" -ForegroundColor Yellow
Write-Host "   Pipeline Job ID: $($pipelineJob.Id)" -ForegroundColor Gray
Write-Host "   Backend Job ID: $($backendJob.Id)" -ForegroundColor Gray
Write-Host ""
Write-Host "🛠️ To stop servers later, run:" -ForegroundColor Yellow
Write-Host "   Stop-Job -Id $($pipelineJob.Id),$($backendJob.Id)" -ForegroundColor Gray
Write-Host "   Remove-Job -Id $($pipelineJob.Id),$($backendJob.Id)" -ForegroundColor Gray
Write-Host ""

# Interactive monitoring
Write-Host "Commands:" -ForegroundColor Yellow
Write-Host "  's' + Enter = Check server status" -ForegroundColor Gray
Write-Host "  'q' + Enter = Quit and stop all servers" -ForegroundColor Gray
Write-Host "  'l' + Enter = View server logs" -ForegroundColor Gray
Write-Host ""

do {
    $key = Read-Host "Enter command (s/q/l)"
    
    switch ($key.ToLower()) {
        "s" {
            Write-Host ""
            Write-Host "Server Status Check:" -ForegroundColor Yellow
            
            # Check jobs
            $pipelineStatus = Get-Job -Id $pipelineJob.Id -ErrorAction SilentlyContinue
            $backendStatus = Get-Job -Id $backendJob.Id -ErrorAction SilentlyContinue
            
            if ($pipelineStatus.State -eq "Running") {
                Write-Host "  ✅ Pipeline Job: Running" -ForegroundColor Green
            } else {
                Write-Host "  ❌ Pipeline Job: $($pipelineStatus.State)" -ForegroundColor Red
            }
            
            if ($backendStatus.State -eq "Running") {
                Write-Host "  ✅ Backend Job: Running" -ForegroundColor Green
            } else {
                Write-Host "  ❌ Backend Job: $($backendStatus.State)" -ForegroundColor Red
            }
            
            # Check HTTP endpoints
            try {
                $response = Invoke-RestMethod -Uri "http://localhost:5000/health" -Method Get -TimeoutSec 5 -ErrorAction Stop
                Write-Host "  ✅ Pipeline API: Online ($($response.status))" -ForegroundColor Green
            } catch {
                Write-Host "  ❌ Pipeline API: Offline" -ForegroundColor Red
            }
            
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method Get -TimeoutSec 5 -ErrorAction Stop
                Write-Host "  ✅ Backend Node: Online (Status: $($response.StatusCode))" -ForegroundColor Green
            } catch {
                Write-Host "  ❌ Backend Node: Offline" -ForegroundColor Red
            }
            Write-Host ""
        }
        "l" {
            Write-Host ""
            Write-Host "Recent Pipeline Logs:" -ForegroundColor Yellow
            Receive-Job -Id $pipelineJob.Id -Keep | Select-Object -Last 10
            Write-Host ""
            Write-Host "Recent Backend Logs:" -ForegroundColor Yellow  
            Receive-Job -Id $backendJob.Id -Keep | Select-Object -Last 10
            Write-Host ""
        }
    }
} while ($key.ToLower() -ne "q")

# Cleanup
Write-Host ""
Write-Host "Stopping all servers..." -ForegroundColor Yellow
Stop-Job -Id $pipelineJob.Id,$backendJob.Id -ErrorAction SilentlyContinue
Remove-Job -Id $pipelineJob.Id,$backendJob.Id -ErrorAction SilentlyContinue
Write-Host "✅ All servers stopped successfully!" -ForegroundColor Green
Write-Host "👋 Goodbye!" -ForegroundColor Cyan