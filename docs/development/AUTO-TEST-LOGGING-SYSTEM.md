# UniVoice 開発用自動テスト・ログシステム

## 概要

UniVoice 2.0には、開発効率を向上させるための自動テスト・ログ収集システムが組み込まれています。
このシステムは開発モードで自動的に有効化され、以下の機能を提供します：

- 🚀 アプリ起動時の自動テスト実行
- 📊 包括的なログ収集（コンソール、イベント、UI状態）
- 📸 定期的なスクリーンショット撮影
- 🔍 ログ解析・検索ツール

## アーキテクチャ

```
UniVoice/
├── electron/services/
│   └── DevTestService.ts      # メインサービス
├── logs/                      # ログ保存ディレクトリ
│   ├── dev-sessions/          # セッションごとのログ
│   ├── screenshots/           # スクリーンショット
│   └── ui-states/            # UI状態スナップショット
├── read-dev-logs.js          # ログ読み取りツール
└── run-dev-test.js           # 手動テスト実行スクリプト
```

## DevTestService

### 主要機能

1. **自動テスト実行**
   - アプリ起動3秒後に自動実行
   - 設定可能なテストシナリオ
   - 期待される結果の検証

2. **ログ収集**
   - console.log/warn/error の自動キャプチャ
   - パイプラインイベントの記録
   - UI状態の定期的なキャプチャ（デフォルト: 5秒ごと）

3. **データ保存**
   - セッションIDによる管理
   - JSON形式でのログ保存
   - スクリーンショットのPNG保存

### 設定オプション

```typescript
interface TestConfig {
  autoRunTests: boolean;      // 自動テスト実行（デフォルト: true）
  captureInterval: number;    // UI状態キャプチャ間隔（ms）
  maxLogSize: number;        // 最大ログサイズ（bytes）
  testScenarios: TestScenario[]; // テストシナリオ配列
}
```

## デフォルトテストシナリオ

### Basic ASR and Translation Flow

1. **イベントリスナー設定**
   ```javascript
   window.electron.on('currentOriginalUpdate', handler);
   window.electron.on('currentTranslationUpdate', handler);
   ```

2. **リスニング開始**
   ```javascript
   window.univoice.sendCommand({
     command: 'startListening',
     params: { sourceLanguage: 'en', targetLanguage: 'ja' }
   });
   ```

3. **テストASRイベント送信**
   ```javascript
   window.dispatchEvent(new CustomEvent('pipeline-event', {
     detail: { type: 'asr', ... }
   }));
   ```

4. **UI状態キャプチャ**
   - 履歴項目数
   - 現在の表示内容
   - エラー状態

## ログ形式

### セッションログ（test-log.json）

```json
{
  "sessionId": "dev-20250821-130308",
  "scenario": {
    "id": "basic-flow",
    "name": "Basic ASR and Translation Flow",
    "steps": [...],
    "expectedResults": [...]
  },
  "logs": [
    {
      "timestamp": 1755745988000,
      "type": "console",
      "level": "info",
      "data": ["🎤 Original:", { "text": "Hello world" }]
    }
  ]
}
```

### サマリー（summary.json）

```json
{
  "sessionId": "dev-20250821-130308",
  "timestamp": "2025-08-21T04:03:08.000Z",
  "scenario": "Basic ASR and Translation Flow",
  "totalLogs": 150,
  "errors": 0,
  "warnings": 2,
  "events": 45,
  "screenshots": 5
}
```

## 使用方法

### 1. 自動実行（開発モード）

開発モードでアプリを起動すると自動的に有効化されます：

```bash
npm run dev     # または
npm run electron
```

### 2. 手動テスト実行

DevToolsコンソールで以下を実行：

```javascript
// run-dev-test.js の内容をコピー＆ペースト
(async () => {
  console.log('🚀 開発テスト開始...');
  // ... テストコード
})();
```

### 3. ログ確認

```bash
# 最新セッションを解析
node read-dev-logs.js

# 特定のパターンを検索
node read-dev-logs.js search "error"

# 特定のセッションを解析
node read-dev-logs.js session dev-20250821-130308
```

## ログ解析ツール出力例

```
📊 Analyzing session: dev-20250821-130308
==================================================

📈 Summary:
   Total logs: 150
   Errors: 0 ✅
   Warnings: 2
   Events: 45
   Screenshots: 5

📡 Event Flow:
   [13:03:11] setup-listeners: {}
   [13:03:12] start-listening: {"sourceLanguage":"en","targetLanguage":"ja"}
   [13:03:14] send-test-asr: {"text":"Hello world, testing UniVoice"}
   [13:03:17] capture-ui-state: {}

🖼️  Latest UI State:
   History items: 1
   Current Original: "Hello world, testing UniVoice"
   Current Translation: "こんにちは世界、UniVoiceをテストしています"

📷 Screenshots:
   logs\screenshots\dev-20250821-130308-1755745997000.png

==================================================
Full logs: logs\dev-sessions\dev-20250821-130308\test-log.json
```

## トラブルシューティング

### ログが保存されない

1. `logs/` ディレクトリの権限を確認
2. `maxLogSize` 設定を確認（デフォルト: 10MB）
3. DevTestServiceがアタッチされているか確認

### スクリーンショットが撮れない

1. Electronのセキュリティ設定を確認
2. `captureInterval` が0でないことを確認
3. ウィンドウが最小化されていないことを確認

### テストが自動実行されない

1. 開発モードで起動しているか確認
2. `autoRunTests` がtrueに設定されているか確認
3. main.tsでDevTestServiceがアタッチされているか確認

## カスタマイズ

### 新しいテストシナリオの追加

```typescript
const customScenario: TestScenario = {
  id: 'custom-flow',
  name: 'Custom Test Flow',
  steps: [
    {
      action: 'custom-action',
      params: { /* ... */ },
      delay: 1000
    }
  ],
  expectedResults: ['Expected outcome']
};
```

### ログキャプチャの拡張

DevTestServiceの`injectLogCapture`メソッドを拡張して、
追加のイベントやメトリクスをキャプチャできます。

## セキュリティ考慮事項

- このシステムは開発モードでのみ有効化されます
- 本番ビルドには含まれません
- ログファイルは`.gitignore`に含まれています
- 機密情報（APIキー等）はログに含まれないよう注意

## 今後の拡張予定

- [ ] パフォーマンスメトリクスの自動収集
- [ ] ビジュアル回帰テスト
- [ ] 自動エラーレポート生成
- [ ] CI/CD統合
- [ ] リモートログ収集

---

最終更新: 2025-08-21
作成者: Claude Code
バージョン: 1.0.0