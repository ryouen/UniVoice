# UniVoice 2.0 起動スクリプト

Write-Host "Starting UniVoice 2.0..." -ForegroundColor Green

# 既存のプロセスを終了
Write-Host "Cleaning up existing processes..." -ForegroundColor Yellow
Stop-Process -Name "electron" -ErrorAction SilentlyContinue
Stop-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*vite*" }

# Vite開発サーバーを起動
Write-Host "Starting Vite dev server..." -ForegroundColor Yellow
Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WorkingDirectory $PSScriptRoot -WindowStyle Hidden

# 5秒待機
Write-Host "Waiting for dev server to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Electronを起動
Write-Host "Starting Electron app..." -ForegroundColor Yellow
Start-Process -FilePath "npm" -ArgumentList "run", "electron" -WorkingDirectory $PSScriptRoot

Write-Host "UniVoice 2.0 started successfully!" -ForegroundColor Green
Write-Host "Press F12 in the app to open DevTools" -ForegroundColor Cyan