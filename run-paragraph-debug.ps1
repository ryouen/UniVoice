# PowerShell script to run app with detailed paragraph debugging

Write-Host "Starting UniVoice with ParagraphBuilder debugging..." -ForegroundColor Green

# Set environment variables for debugging
$env:NODE_ENV = "development"
$env:DEBUG = "true"
$env:ELECTRON_ENABLE_LOGGING = "true"
$env:LOG_LEVEL = "debug"

# Clear old logs
if (Test-Path "app-debug.log") {
    Remove-Item "app-debug.log"
}

Write-Host "Starting Electron app..." -ForegroundColor Yellow

# Run the app and capture output
& npm run electron 2>&1 | Tee-Object -FilePath "paragraph-debug-output.log" | ForEach-Object {
    $line = $_
    
    # Highlight ParagraphBuilder related logs
    if ($line -match "ParagraphBuilder|DataFlow-3b|handleParagraphComplete|processTranscriptSegment|addSegment|Started new paragraph|Completing paragraph") {
        Write-Host $line -ForegroundColor Cyan
    }
    # Highlight ASR events
    elseif ($line -match "ASR event|currentOriginalUpdate|isFinal: true") {
        Write-Host $line -ForegroundColor Green
    }
    # Highlight errors
    elseif ($line -match "error|Error|failed|Failed") {
        Write-Host $line -ForegroundColor Red
    }
    # Normal output
    else {
        Write-Host $line
    }
}

Write-Host "`nDebug session ended. Check paragraph-debug-output.log for full output." -ForegroundColor Yellow