@echo off
echo ========================================
echo Starting UniVoice with Enhanced Diagnostics
echo ========================================
echo.
echo This will start the application with detailed console logging
echo to help diagnose the Deepgram 400 error.
echo.
echo Look for these in the console:
echo - [UnifiedPipelineService] messages
echo - WebSocket connection status
echo - Audio chunk information
echo - Error details
echo.
echo Press Ctrl+C to stop the application.
echo ========================================
echo.

REM Set debug environment variables
set DEBUG=univoice:*
set LOG_LEVEL=debug

REM Start the application
npm run electron