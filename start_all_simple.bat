@echo off
echo ====================================
echo    Starting All Servers
echo ====================================

set PROJECT_ROOT=D:\Soham\HACKATHONS\SIH 2025\New Model - Copy\SIH-INITIAL - Manan - Copy

echo Starting Pipeline API Server...
start "Pipeline API (Port 5000)" cmd /k "cd /d "%PROJECT_ROOT%\pipeline" && python api_server.py"

echo Waiting for Pipeline API to start...
timeout /t 5 /nobreak >nul

echo Starting Backend Node Server...
start "Backend Node (Port 3000)" cmd /k "cd /d "%PROJECT_ROOT%\backend-node" && node server.js"

echo.
echo ====================================
echo    All Servers Started!
echo ====================================
echo Pipeline API: http://localhost:5000
echo Backend Node: http://localhost:3000
echo.
pause