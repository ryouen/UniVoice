@echo off
echo Starting UniVoice Electron app...
echo.
echo NOTE: Make sure Vite dev server is running on port 5173-5195
echo.
cd /d "%~dp0"
npm run electron
pause