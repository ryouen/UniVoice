# UniVoice バックアップスクリプト
$timestamp = Get-Date -Format 'yyyy-MM-dd_HHmmss'
$backupDir = "C:\Users\ryosu\Dropbox\ai\realtime_transtrator\UniVoice\backup\$timestamp"

# バックアップディレクトリ作成
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

# 重要ファイルのリスト
$filesToBackup = @(
    'src\components\UniVoice.tsx',
    'src\hooks\useUnifiedPipeline.ts',
    'electron\services\domain\DataPersistenceService.ts',
    'src\presentation\components\UniVoice\sections\SetupSection\SetupSection.tsx',
    'electron\main.ts',
    'src\services\IncrementalTextManager.ts',
    'src\services\FlexibleHistoryDisplay.tsx'
)

# ファイルをコピー
foreach ($file in $filesToBackup) {
    $source = "C:\Users\ryosu\Dropbox\ai\realtime_transtrator\UniVoice\$file"
    if (Test-Path $source) {
        Copy-Item -Path $source -Destination $backupDir -Force
        Write-Host "Backed up: $file"
    } else {
        Write-Host "File not found: $file" -ForegroundColor Yellow
    }
}

Write-Host "`nBackup completed to: $backupDir" -ForegroundColor Green