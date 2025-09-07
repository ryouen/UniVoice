# ロールバックスクリプト
# 実行日: 2025-08-24
# 目的: 翻訳タイムアウト実装を元に戻す

Write-Host "Starting rollback..." -ForegroundColor Yellow

$originalDir = "$PSScriptRoot\original"
$targetFiles = @(
    @{src="useUnifiedPipeline.ts"; dest="..\..\src\hooks\useUnifiedPipeline.ts"},
    @{src="UnifiedPipelineService.ts"; dest="..\..\electron\services\domain\UnifiedPipelineService.ts"},
    @{src="RealtimeDisplayService.ts"; dest="..\..\src\domain\services\RealtimeDisplayService.ts"},
    @{src="SyncedRealtimeDisplayManager.ts"; dest="..\..\src\utils\SyncedRealtimeDisplayManager.ts"}
)

$restoredCount = 0
foreach ($file in $targetFiles) {
    $sourcePath = Join-Path $originalDir $file.src
    if (Test-Path $sourcePath) {
        Copy-Item $sourcePath $file.dest -Force
        Write-Host "Restored: $($file.dest)" -ForegroundColor Green
        $restoredCount++
    } else {
        Write-Host "Not found: $sourcePath" -ForegroundColor Red
    }
}

# 新規作成したファイルの削除
$newFiles = @(
    "..\..\src\utils\TranslationTimeoutManager.ts",
    "..\..\src\utils\TranslationQueueManager.ts",
    "..\..\tests\unit\TranslationTimeoutManager.test.ts",
    "..\..\tests\unit\TranslationQueueManager.test.ts"
)

foreach ($file in $newFiles) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "Removed: $file" -ForegroundColor Yellow
    }
}

Write-Host "`nRollback completed!" -ForegroundColor Green
Write-Host "Restored $restoredCount files" -ForegroundColor Cyan
Write-Host "`nPlease restart the application to ensure changes take effect." -ForegroundColor Yellow