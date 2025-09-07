@echo off
echo バックアップを開始します...

set BACKUP_DIR=backup\2025-08-30-deep-think
mkdir %BACKUP_DIR% 2>nul

echo 重要ファイルをバックアップしています...
copy src\hooks\useUnifiedPipeline.ts %BACKUP_DIR%\useUnifiedPipeline.ts.bak
copy electron\services\domain\UnifiedPipelineService.ts %BACKUP_DIR%\UnifiedPipelineService.ts.bak
copy src\utils\FlexibleHistoryGrouper.ts %BACKUP_DIR%\FlexibleHistoryGrouper.ts.bak
copy src\components\FlexibleHistoryDisplay.tsx %BACKUP_DIR%\FlexibleHistoryDisplay.tsx.bak

echo.
echo バックアップ完了:
dir %BACKUP_DIR%\*.bak /B
echo.
echo バックアップが完了しました。