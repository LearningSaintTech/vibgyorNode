@echo off
echo ========================================
echo HTTPS Setup for Vibgyor App
echo ========================================
echo.

echo Step 1: Installing mkcert...
echo Please run one of these commands manually:
echo   Windows (Chocolatey): choco install mkcert
echo   Windows (Scoop): scoop install mkcert
echo   Mac: brew install mkcert
echo   Linux: Download from https://github.com/FiloSottile/mkcert/releases
echo.

echo Step 2: Installing local CA...
echo Please run: mkcert -install
echo.

echo Step 3: Finding your local IP...
ipconfig | findstr "IPv4"
echo.

echo Step 4: Creating SSL certificates...
echo Please run: mkcert localhost 127.0.0.1 YOUR_LOCAL_IP ::1
echo (Replace YOUR_LOCAL_IP with your actual IP from step 3)
echo.

echo Step 5: Creating frontend environment file...
if not exist "vibgyor-frontend\.env" (
    echo VITE_API_URL=https://YOUR_LOCAL_IP:3000 > vibgyor-frontend\.env
    echo VITE_SOCKET_URL=https://YOUR_LOCAL_IP:3000 >> vibgyor-frontend\.env
    echo VITE_ENVIRONMENT=development >> vibgyor-frontend\.env
    echo Created vibgyor-frontend\.env file
    echo Please update YOUR_LOCAL_IP with your actual IP address
) else (
    echo vibgyor-frontend\.env already exists
)

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Update vibgyor-frontend\.env with your actual IP
echo 2. Start backend: npm start
echo 3. Start frontend: cd vibgyor-frontend && npm run dev
echo 4. Test: https://YOUR_LOCAL_IP:3000 and https://YOUR_LOCAL_IP:5173
echo.
pause

