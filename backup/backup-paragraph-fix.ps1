# UniVoice パラグラフ修正用バックアップスクリプト
$timestamp = Get-Date -Format 'yyyy-MM-dd_HHmmss'
$backupDir = "C:\Users\ryosu\Dropbox\ai\realtime_transtrator\backup\UniVoice_paragraph_fix_$timestamp"

# バックアップディレクトリ作成
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

# UniVoiceフォルダ全体をバックアップ
Write-Host "Creating full backup of UniVoice folder..."
Copy-Item -Path "C:\Users\ryosu\Dropbox\ai\realtime_transtrator\UniVoice" -Destination $backupDir -Recurse -Force

# 重要ファイルのリスト（特に注意すべきファイル）
$criticalFiles = @(
    "electron\services\domain\SentenceCombiner.ts",
    "electron\services\domain\ParagraphBuilder.ts",
    "electron\services\domain\UnifiedPipelineService.ts",
    "src\hooks\useUnifiedPipeline.ts",
    "src\utils\FlexibleHistoryGrouper.ts",
    "src\components\FlexibleHistoryDisplay.tsx"
)

Write-Host "`n=== Critical files for paragraph implementation ==="
foreach ($file in $criticalFiles) {
    $fullPath = "$backupDir\UniVoice\$file"
    if (Test-Path $fullPath) {
        Write-Host "[OK] $file" -ForegroundColor Green
    } else {
        Write-Host "[MISSING] $file" -ForegroundColor Red
    }
}

Write-Host "`nBackup completed to: $backupDir" -ForegroundColor Green
Write-Host "Total size: $((Get-ChildItem $backupDir -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB) MB"