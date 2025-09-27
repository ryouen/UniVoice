# UniVoice Window State Checker
# PowerShellスクリプト - 管理者権限不要

Write-Host "=== UniVoice Window State Check ===" -ForegroundColor Cyan
Write-Host ""

# 1. window-bounds.json の存在確認
$boundsPath = "$env:APPDATA\univoice\window-bounds.json"
Write-Host "1. Checking window-bounds.json..." -ForegroundColor Yellow

if (Test-Path $boundsPath) {
    Write-Host "   ✓ File exists" -ForegroundColor Green
    $content = Get-Content $boundsPath | ConvertFrom-Json
    
    # setup エントリの確認
    if ($content.windows.setup) {
        Write-Host "   ⚠ WARNING: 'setup' entry found!" -ForegroundColor Red
        Write-Host "     Width: $($content.windows.setup.width)px" -ForegroundColor Red
        Write-Host "     Height: $($content.windows.setup.height)px" -ForegroundColor Red
        
        # 削除を提案
        Write-Host ""
        $response = Read-Host "   Delete window-bounds.json to fix this? (Y/N)"
        if ($response -eq 'Y' -or $response -eq 'y') {
            Remove-Item $boundsPath -Force
            Write-Host "   ✓ File deleted" -ForegroundColor Green
        }
    } else {
        Write-Host "   ✓ No 'setup' entry (Good!)" -ForegroundColor Green
    }
    
    # main エントリの情報
    if ($content.windows.main) {
        Write-Host "   Main window size: $($content.windows.main.width) x $($content.windows.main.height)" -ForegroundColor Cyan
    }
} else {
    Write-Host "   ✓ File not found (Clean state)" -ForegroundColor Green
}

Write-Host ""

# 2. ビルド状態の確認
Write-Host "2. Checking build status..." -ForegroundColor Yellow

$distElectron = "dist-electron"
$distWeb = "dist"

if (Test-Path $distElectron) {
    $lastModified = (Get-Item $distElectron).LastWriteTime
    Write-Host "   ✓ Electron build exists (Modified: $lastModified)" -ForegroundColor Green
} else {
    Write-Host "   ✗ Electron build missing - Run 'npm run build'" -ForegroundColor Red
}

if (Test-Path $distWeb) {
    Write-Host "   ✓ Web build exists" -ForegroundColor Green
} else {
    Write-Host "   ✗ Web build missing" -ForegroundColor Red
}

Write-Host ""

# 3. 重要なソースファイルの最終更新確認
Write-Host "3. Recent modifications..." -ForegroundColor Yellow

$files = @(
    "electron\main\WindowRegistry.ts",
    "electron\main\BoundsStore.ts", 
    "src\components\UniVoice.tsx",
    "src\components\UniVoice.module.css"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        $info = Get-Item $file
        $timeAgo = (Get-Date) - $info.LastWriteTime
        Write-Host "   $file - Modified $($timeAgo.Hours)h $($timeAgo.Minutes)m ago" -ForegroundColor Cyan
    }
}

Write-Host ""
Write-Host "=== Check Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Run 'npm run electron' to start the app"
Write-Host "2. Follow WINDOW-RESIZE-TEST-CHECKLIST.md"
Write-Host ""