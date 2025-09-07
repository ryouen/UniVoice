@echo off
echo ========================================
echo     UniVoice Startup Script
echo ========================================
echo.

echo Step 1: Cleaning up existing processes...
taskkill /F /IM electron.exe /T 2>nul
taskkill /F /IM node.exe /T 2>nul
timeout /t 2 /nobreak >nul

echo Step 2: Starting Vite dev server...
start /B cmd /c "npm run dev 2>&1"
echo Waiting for Vite to be ready...
timeout /t 5 /nobreak >nul

echo Step 3: Starting Electron app...
npm run electron

echo.
echo ========================================
echo UniVoice has been terminated.
echo ========================================
pause