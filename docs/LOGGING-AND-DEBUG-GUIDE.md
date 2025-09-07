# 📊 ログ出力とデバッグガイド

**作成日**: 2025-09-04  
**作成者**: Claude Code

## 🎯 ログシステム概要

UniVoice 2.0は構造化されたログシステムを持ち、開発者と協調的な作業をサポートします。

## 📁 ログファイルの場所

### メインログディレクトリ
```
UniVoice/logs/
├── univoice-2025-09-04.jsonl    # 本日のメインログ（JSONL形式）
├── dev-sessions/                 # 開発セッション別ログ
├── screenshots/                  # スクリーンショット
└── ui-states/                    # UIステートスナップショット
```

### 特殊ログファイル
```
UniVoice/
├── app-debug.log                 # デバッグ用ログ
├── app-paragraph-test.log        # パラグラフテストログ
└── paragraph-test-output.log     # パラグラフ処理の詳細ログ
```

## 📝 ログの読み方

### JSONL形式（1行1JSON）
```json
{"timestamp":"2025-09-04T01:47:20.345Z","level":"info","message":"Pipeline service setup completed","component":"Main"}
{"timestamp":"2025-09-04T01:47:20.346Z","level":"info","message":"Using default data path: C:\\Users\\ryosu\\UniVoice","component":"DataPersistence"}
```

### ログレベル
- **debug**: 詳細なデバッグ情報（青色）
- **info**: 通常の動作情報（緑色）
- **warn**: 警告（黄色）
- **error**: エラー（赤色）

## 🔧 デバッグ用ツール

### 1. リアルタイムログ表示
```javascript
// read-dev-logs.js
const fs = require('fs');
const path = require('path');

// 最新のログをリアルタイムで表示
const logFile = path.join(__dirname, 'logs', `univoice-${new Date().toISOString().split('T')[0]}.jsonl`);
const tail = require('child_process').spawn('tail', ['-f', logFile]);

tail.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line);
  lines.forEach(line => {
    try {
      const log = JSON.parse(line);
      console.log(`[${log.level}] ${log.message}`, log.data || '');
    } catch (e) {
      console.log(line);
    }
  });
});
```

### 2. エラーログ抽出
```bash
# エラーのみを抽出
grep '"level":"error"' logs/univoice-2025-09-04.jsonl | jq '.'

# 特定コンポーネントのログを抽出
grep '"component":"AdvancedFeatureService"' logs/univoice-2025-09-04.jsonl | jq '.'
```

### 3. パフォーマンス分析
```javascript
// パフォーマンスログの分析
const logs = fs.readFileSync('logs/univoice-2025-09-04.jsonl', 'utf8')
  .split('\n')
  .filter(line => line)
  .map(line => JSON.parse(line))
  .filter(log => log.performance);

console.log('パフォーマンスサマリー:');
logs.forEach(log => {
  console.log(`${log.message}: ${log.performance.duration}ms`);
});
```

## 🐛 よくあるデバッグシナリオ

### 1. セッション開始時の問題
```bash
# セッション開始ログを確認
grep "session-metadata-update" logs/univoice-2025-09-04.jsonl
```

### 2. 翻訳遅延の調査
```bash
# 翻訳パフォーマンスを確認
grep "translation" logs/univoice-2025-09-04.jsonl | grep "performance"
```

### 3. AdvancedFeatureService動作確認
```bash
# 要約・語彙・レポート生成のログ
grep -E "(summary|vocabulary|report)" logs/univoice-2025-09-04.jsonl
```

## 💡 開発者との協調

### ログ共有時の推奨フォーマット
```markdown
## 問題の概要
[問題の説明]

## 発生時刻
2025-09-04T01:47:20Z付近

## 関連ログ
```json
[該当するログエントリ]
```

## 再現手順
1. [手順1]
2. [手順2]
```

### correlationIdの活用
各セッションには一意のcorrelationIdが割り当てられ、関連するログを追跡できます：
```bash
# 特定セッションのすべてのログ
grep '"correlationId":"session-12345"' logs/univoice-2025-09-04.jsonl
```

## 🔍 ログ設定の変更

### 環境変数
```bash
# ログレベルの変更（debug/info/warn/error）
LOG_LEVEL=debug npm run electron

# 開発モードでの詳細ログ
NODE_ENV=development npm run electron
```

### プログラムからのログ出力
```typescript
import { logger } from './utils/logger';

// 基本的なログ
logger.info('セッション開始', { sessionId: '12345' });

// コンポーネント別ログ
const serviceLogger = logger.child('AdvancedFeatureService');
serviceLogger.info('要約生成開始', { wordCount: 400 });

// パフォーマンス計測
const startTime = Date.now();
// ... 処理 ...
logger.performance('info', '翻訳完了', startTime, { textLength: 100 });
```

## 📊 ログ分析ツール

### 日次サマリー生成
```javascript
// analyze-daily-logs.js
const fs = require('fs');
const logFile = `logs/univoice-${new Date().toISOString().split('T')[0]}.jsonl`;

const logs = fs.readFileSync(logFile, 'utf8')
  .split('\n')
  .filter(line => line)
  .map(line => JSON.parse(line));

const summary = {
  total: logs.length,
  errors: logs.filter(l => l.level === 'error').length,
  warnings: logs.filter(l => l.level === 'warn').length,
  components: [...new Set(logs.map(l => l.component).filter(c => c))],
  sessions: [...new Set(logs.map(l => l.correlationId).filter(c => c))]
};

console.log('日次ログサマリー:', summary);
```

## 🚀 次回セッションでの活用

新しいセッションを開始する際は、必ず以下を確認：

1. **最新のログファイル名**
   ```bash
   ls -la logs/univoice-*.jsonl | tail -1
   ```

2. **エラーの有無**
   ```bash
   grep '"level":"error"' logs/univoice-$(date +%Y-%m-%d).jsonl | wc -l
   ```

3. **前回セッションの終了状態**
   ```bash
   tail -20 logs/univoice-$(date +%Y-%m-%d).jsonl
   ```

これにより、前回の作業内容や問題を迅速に把握し、継続的な開発が可能になります。