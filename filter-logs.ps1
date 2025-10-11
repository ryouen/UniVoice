# UniVoice className ログフィルタ for PowerShell
# 使い方: npm run dev | .\filter-logs.ps1

$keywords = @(
    "className",
    "COMPANY", 
    "session_",
    "session-metadata-update",
    "courseName",
    "Session started",
    "DataPersistenceService",
    "startSession",
    "Starting new session"
)

# カラー設定
$colors = @{
    "error" = "Red"
    "warn" = "Yellow"
    "info" = "Cyan"
    "debug" = "Gray"
    "important" = "Green"
}

Write-Host "=== className Debug Filter Started ===" -ForegroundColor Green
Write-Host "Filtering for: $($keywords -join ', ')" -ForegroundColor Cyan

while ($line = Read-Host) {
    $shouldShow = $false
    $isImportant = $false
    
    foreach ($keyword in $keywords) {
        if ($line -match $keyword) {
            $shouldShow = $true
            
            # 特に重要なパターンを検出
            if ($line -match "session_\d{4}-\d{2}-\d{2}" -or 
                $line -match "className.*undefined" -or
                $line -match "empty className") {
                $isImportant = $true
            }
            break
        }
    }
    
    if ($shouldShow) {
        $timestamp = Get-Date -Format "HH:mm:ss"
        $color = "White"
        
        if ($line -match "error" -or $line -match "ERROR") {
            $color = $colors["error"]
        } elseif ($line -match "warn" -or $line -match "WARN") {
            $color = $colors["warn"]
        } elseif ($line -match "info" -or $line -match "INFO") {
            $color = $colors["info"]
        }
        
        if ($isImportant) {
            Write-Host "⚠️ [$timestamp] IMPORTANT: " -NoNewline -ForegroundColor Red
            Write-Host $line -ForegroundColor Yellow -BackgroundColor DarkRed
        } else {
            Write-Host "[$timestamp] " -NoNewline -ForegroundColor DarkGray
            Write-Host $line -ForegroundColor $color
        }
    }
    
    # 元の出力も表示（薄い色で）
    Write-Host $line -ForegroundColor DarkGray
}