@echo off
echo ====================================
echo   Starting All Servers
echo ====================================
echo.

echo Starting MongoDB (if not already running)...
net start MongoDB 2>nul

echo.
echo Starting Pipeline API Server (Port 5000)...
start "Pipeline API Server" cmd /k "cd /d "D:\Soham\HACKATHONS\SIH 2025\New Model - Copy\SIH-INITIAL - Manan - Copy\pipeline" && python api_server.py"

echo.
echo Waiting 3 seconds for Pipeline API to start...
timeout /t 3 /nobreak > nul

echo.
echo Starting Backend Node.js Server (Port 3000)...
start "Backend Node Server" cmd /k "cd /d "D:\Soham\HACKATHONS\SIH 2025\New Model - Copy\SIH-INITIAL - Manan - Copy\backend-node" && node server.js"

echo.
echo ====================================
echo   All Servers Started!
echo ====================================
echo.
echo Pipeline API Server: http://localhost:5000
echo Backend Node Server: http://localhost:3000
echo.
echo Press any key to test the connection...
pause

echo.
echo Testing Pipeline API Health...
powershell -Command "try { $response = Invoke-RestMethod -Uri 'http://localhost:5000/health' -Method Get; Write-Host 'Pipeline API Status:' $response.status -ForegroundColor Green } catch { Write-Host 'Pipeline API not responding' -ForegroundColor Red }"

echo.
echo Testing Backend Node Server...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3000' -Method Get -TimeoutSec 5; Write-Host 'Backend Node Server is responding' -ForegroundColor Green } catch { Write-Host 'Backend Node Server not responding' -ForegroundColor Red }"

echo.
echo ====================================
echo   Integration Test Complete
echo ====================================
echo.
echo You can now access the web interface at:
echo http://localhost:3000
echo.
pause