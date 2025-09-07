@echo off
echo Starting UniVoice 2.0 Test Environment...
echo.

REM Kill any existing Electron processes
taskkill /F /IM electron.exe 2>nul

REM Start Vite dev server in background
echo Starting Vite dev server...
start /B cmd /c "npm run dev"

REM Wait for dev server to start
echo Waiting for dev server to start...
timeout /t 5 /nobreak > nul

REM Start Electron
echo Starting Electron app...
npm run electron

echo.
echo Test completed.
pause