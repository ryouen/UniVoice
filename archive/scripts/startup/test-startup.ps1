# Clean startup test script

Write-Host "🧹 Cleaning up existing processes..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.Name -match "electron|node"} | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "⏳ Waiting for processes to terminate..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

Write-Host "🚀 Starting development server..." -ForegroundColor Green
$devProcess = Start-Process -FilePath "npm" -ArgumentList "run dev" -WorkingDirectory "." -PassThru -WindowStyle Hidden

Write-Host "⏳ Waiting for dev server to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "🖥️ Starting Electron app..." -ForegroundColor Green
$electronProcess = Start-Process -FilePath "npm" -ArgumentList "run electron" -WorkingDirectory "." -PassThru

Write-Host "✅ Application started!" -ForegroundColor Green
Write-Host "   Dev server PID: $($devProcess.Id)" -ForegroundColor Gray
Write-Host "   Electron PID: $($electronProcess.Id)" -ForegroundColor Gray
Write-Host ""
Write-Host "Press any key to stop the application..." -ForegroundColor Yellow
$null = $host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Write-Host "🛑 Stopping application..." -ForegroundColor Red
Stop-Process -Id $devProcess.Id -Force -ErrorAction SilentlyContinue
Stop-Process -Id $electronProcess.Id -Force -ErrorAction SilentlyContinue

Write-Host "✅ Application stopped" -ForegroundColor Green