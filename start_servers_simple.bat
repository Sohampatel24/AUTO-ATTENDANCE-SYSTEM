@echo off
echo =====================================
echo    Starting SIH 2025 Servers
echo =====================================
echo.

REM Set paths
set PROJECT_ROOT=D:\Soham\HACKATHONS\SIH 2025\New Model - Copy\SIH-INITIAL - Manan - Copy
set PIPELINE_PATH=%PROJECT_ROOT%\pipeline
set BACKEND_PATH=%PROJECT_ROOT%\backend-node

echo Checking MongoDB status...
net start MongoDB >nul 2>&1
if %errorlevel% == 0 (
    echo [✓] MongoDB is running
) else (
    echo [!] MongoDB may not be running or already started
)

echo.
echo Starting servers...
echo.

echo Starting Pipeline API Server (Port 5000)...
cd /d "%PIPELINE_PATH%"
start "Pipeline API" cmd /k "python api_server.py"

echo Waiting 5 seconds...
timeout /t 5 /nobreak >nul

echo.
echo Starting Backend Node.js Server (Port 3000)...
cd /d "%BACKEND_PATH%"
start "Backend Node" cmd /k "node server.js"

echo.
echo =====================================
echo    All Servers Started!
echo =====================================
echo.
echo Frontend: http://localhost:3000
echo API: http://localhost:5000
echo.
echo Press any key to continue...
pause >nul

echo.
echo Testing connectivity...
timeout /t 10 /nobreak >nul

curl -s http://localhost:5000/health >nul 2>&1
if %errorlevel% == 0 (
    echo [✓] Pipeline API is responding
) else (
    echo [!] Pipeline API may still be starting up
)

curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% == 0 (
    echo [✓] Backend Node is responding
) else (
    echo [!] Backend Node may still be starting up
)

echo.
echo =====================================
echo    Setup Complete!
echo =====================================
echo.
echo Your application should be accessible at:
echo http://localhost:3000
echo.
echo Close this window and the server windows to stop all services.
pause