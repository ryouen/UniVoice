# UniVoice Startup Script for PowerShell

Write-Host "========================================"
Write-Host "     UniVoice Startup Script" -ForegroundColor Cyan
Write-Host "========================================"
Write-Host ""

# Step 1: Clean up existing processes
Write-Host "Step 1: Cleaning up existing processes..." -ForegroundColor Yellow
Stop-Process -Name electron -Force -ErrorAction SilentlyContinue
Stop-Process -Name node -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Step 2: Start Vite dev server
Write-Host "Step 2: Starting Vite dev server..." -ForegroundColor Yellow
$vite = Start-Process -FilePath "npm" -ArgumentList "run dev" -PassThru -NoNewWindow

# Wait for Vite to be ready
Write-Host "Waiting for Vite to be ready..." -ForegroundColor Gray
$maxWait = 10
$waited = 0
$viteReady = $false

while ($waited -lt $maxWait -and -not $viteReady) {
    Start-Sleep -Seconds 1
    $waited++
    
    # Check if any of the common Vite ports are listening
    $ports = @(5173, 5174, 5175, 5176, 5177, 5178, 5179, 5180, 5181, 5182)
    foreach ($port in $ports) {
        $connection = Test-NetConnection -ComputerName localhost -Port $port -InformationLevel Quiet -WarningAction SilentlyContinue
        if ($connection) {
            $viteReady = $true
            Write-Host "✓ Vite is ready on port $port" -ForegroundColor Green
            break
        }
    }
}

if (-not $viteReady) {
    Write-Host "⚠ Vite may not be ready yet, but continuing anyway..." -ForegroundColor Yellow
}

# Step 3: Start Electron
Write-Host ""
Write-Host "Step 3: Starting Electron app..." -ForegroundColor Yellow
npm run electron

Write-Host ""
Write-Host "========================================"
Write-Host "UniVoice has been terminated." -ForegroundColor Cyan
Write-Host "========================================"
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")