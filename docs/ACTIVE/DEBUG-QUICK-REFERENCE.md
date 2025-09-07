# 🚀 デバッグクイックリファレンス

## ログファイル確認コマンド（即座にコピペ可能）

### 今日のログを確認
```bash
# Windows (PowerShell)
Get-Content "logs\univoice-$(Get-Date -Format yyyy-MM-dd).jsonl" -Tail 50

# Windows (cmd)
type "logs\univoice-2025-09-04.jsonl" | more
```

### エラーのみ表示
```bash
# Windows (PowerShell)
Select-String '"level":"error"' "logs\univoice-$(Get-Date -Format yyyy-MM-dd).jsonl"
```

### 特定コンポーネントのログ
```bash
# AdvancedFeatureServiceのログ
Select-String '"component":"AdvancedFeatureService"' "logs\univoice-2025-09-04.jsonl"

# UnifiedPipelineServiceのログ  
Select-String '"component":"UnifiedPipelineService"' "logs\univoice-2025-09-04.jsonl"
```

## 主要なログ出力箇所

| イベント | ログ内容 | ファイル場所 |
|---------|---------|-------------|
| アプリ起動 | "App ready and window created" | electron/main.ts |
| セッション開始 | "session-metadata-update" | src/components/UniVoice.tsx |
| 音声認識開始 | "Starting listening" | electron/services/domain/UnifiedPipelineService.ts |
| 翻訳処理 | "Translation completed" | electron/services/domain/UnifiedPipelineService.ts |
| 要約生成 | "Progressive summary generated" | electron/main.ts:402 |
| 語彙抽出 | "Vocabulary generated" | electron/main.ts:420 |
| レポート生成 | "Final report generated" | electron/main.ts:428 |
| エラー | "AdvancedFeatureService not initialized" | electron/main.ts:292,301 |

## トラブルシューティング

### 問題: ログファイルが見つからない
```bash
# ログディレクトリの確認
dir logs\

# ログファイルの作成を確認
echo. > "logs\univoice-$(Get-Date -Format yyyy-MM-dd).jsonl"
```

### 問題: リアルタイムログ監視
```javascript
// watch-logs.js として保存
const fs = require('fs');
const readline = require('readline');

const logFile = `logs/univoice-${new Date().toISOString().split('T')[0]}.jsonl`;

// ファイルの末尾から監視
const stream = fs.createReadStream(logFile, { 
  encoding: 'utf8',
  start: fs.statSync(logFile).size 
});

const rl = readline.createInterface({ input: stream });

rl.on('line', (line) => {
  try {
    const log = JSON.parse(line);
    const time = new Date(log.timestamp).toLocaleTimeString();
    console.log(`[${time}] ${log.level}: ${log.message}`);
  } catch (e) {
    // JSONパースエラーは無視
  }
});

// ファイル変更を監視
fs.watchFile(logFile, { interval: 100 }, () => {
  // 新しい内容を読み込む
  const newStream = fs.createReadStream(logFile, {
    encoding: 'utf8',
    start: stream.bytesRead
  });
  
  const newRl = readline.createInterface({ input: newStream });
  newRl.on('line', (line) => {
    try {
      const log = JSON.parse(line);
      const time = new Date(log.timestamp).toLocaleTimeString();
      console.log(`[${time}] ${log.level}: ${log.message}`);
    } catch (e) {
      // JSONパースエラーは無視
    }
  });
});

console.log(`Watching ${logFile}...`);
```

実行: `node watch-logs.js`

## ログレベルごとの色分け

開発環境では自動的に色付きで表示されます：
- 🔵 DEBUG - 詳細情報
- 🟢 INFO - 通常動作
- 🟡 WARN - 警告
- 🔴 ERROR - エラー