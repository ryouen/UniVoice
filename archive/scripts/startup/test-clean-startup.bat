@echo off
echo ========================================
echo UniVoice 2.0 Clean Startup Test
echo ========================================
echo.

REM Kill any existing processes
echo Killing existing Node/Electron processes...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM electron.exe >nul 2>&1
timeout /t 2 >nul

REM Clear logs
echo Clearing logs...
if exist "logs" rmdir /S /Q logs >nul 2>&1
mkdir logs

REM Start development servers
echo Starting development servers...
echo.
echo Starting Vite dev server...
start "Vite Dev Server" /MIN cmd /c "npm run dev > logs\vite.log 2>&1"

REM Wait for Vite to start
echo Waiting for Vite to start...
timeout /t 5 >nul

REM Start Electron
echo Starting Electron app...
start "Electron App" cmd /c "npm run electron 2>&1 | tee logs\electron.log"

echo.
echo ========================================
echo Application started!
echo ========================================
echo.
echo Check the following:
echo 1. Application loads without white screen
echo 2. Setup screen appears correctly
echo 3. Console shows "History translation system ready"
echo 4. No TypeScript errors in console
echo.
echo Logs are saved in:
echo - logs\vite.log
echo - logs\electron.log
echo.
echo Press any key to stop all processes...
pause >nul

REM Kill processes
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM electron.exe >nul 2>&1

echo.
echo All processes stopped.
pause