@echo off
echo ========================================
echo    VibgyorNode Port 3000 Cleaner
echo ========================================
echo.

echo Checking for processes using port 3000...
netstat -ano | findstr :3000 > nul
if %errorlevel% neq 0 (
    echo ✅ No processes found using port 3000
    echo Port is available for use.
    pause
    exit /b 0
)

echo ❌ Found processes using port 3000:
echo.
netstat -ano | findstr :3000
echo.

echo Killing processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo Killing process %%a
    taskkill /PID %%a /F > nul 2>&1
    if %errorlevel% equ 0 (
        echo ✅ Successfully killed process %%a
    ) else (
        echo ❌ Failed to kill process %%a
    )
)

echo.
echo ✅ Port 3000 cleanup completed!
echo You can now start the server with: npm run dev
echo.
pause
