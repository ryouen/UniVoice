Write-Host "Starting UniVoice Electron app..." -ForegroundColor Green
Write-Host ""
Write-Host "NOTE: Make sure Vite dev server is running on port 5173-5195" -ForegroundColor Yellow
Write-Host ""

# Change to script directory
Set-Location $PSScriptRoot

# Start electron
npm run electron

# Keep window open
Read-Host "Press Enter to exit"