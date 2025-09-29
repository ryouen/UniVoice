# 📊 ログレベル制御ガイド

**作成日**: 2025-09-26  
**作成者**: Claude Code  
**目的**: パフォーマンスとデバッグのバランスを取るためのログ制御

## 🎯 概要

UniVoice 2.0のログシステムは、環境変数を使用してログの詳細度を制御できます。これにより、開発時には詳細なデバッグ情報を取得し、本番環境では必要最小限のログのみを出力してパフォーマンスを最適化できます。

## 📝 ログレベル

### 利用可能なレベル（優先度順）

1. **debug** - 最も詳細（開発時のみ推奨）
   - 音声フレームカウント（50フレームごと）
   - WebSocket接続の詳細
   - パイプラインの内部状態

2. **info** - 通常の運用情報（デフォルト）
   - サービスの初期化
   - 接続の成功/失敗
   - 重要な設定情報

3. **warn** - 警告
   - 回復可能なエラー
   - 非推奨機能の使用
   - パフォーマンスの低下

4. **error** - エラーのみ
   - 致命的なエラー
   - 回復不可能な状態
   - クラッシュの原因

## 🚀 使用方法

### 環境変数の設定

```bash
# .envファイルで設定
LOG_LEVEL=debug      # 開発時
LOG_LEVEL=info       # デフォルト
LOG_LEVEL=warn       # 本番環境（警告以上）
LOG_LEVEL=error      # 本番環境（エラーのみ）

# コマンドラインで直接指定
LOG_LEVEL=debug npm run electron
```

### 開発環境と本番環境の自動切り替え

```bash
# 開発環境（コンソール出力あり）
NODE_ENV=development npm run electron

# 本番環境（ファイル出力のみ）
NODE_ENV=production npm run electron
```

## 📊 ログ出力例

### Debug レベル（開発時）
```
[2025-09-26T10:00:00.000Z] DEBUG [UnifiedPipelineService]: Audio processing status
  Data: {
    "frameCount": 50,
    "bufferLength": 1920,
    "timestamp": "2025-09-26T10:00:00.000Z"
  }
```

### Info レベル（デフォルト）
```
[2025-09-26T10:00:00.000Z] INFO [UnifiedPipelineService]: Deepgram Configuration
  Data: {
    "model": "nova-3",
    "sourceLanguage": "ja",
    "sampleRate": 16000,
    "interim": true,
    "endpointing": 800
  }
```

### Error レベル（エラーのみ）
```
[2025-09-26T10:00:00.000Z] ERROR [UnifiedPipelineService]: Failed to connect DeepgramStreamAdapter
  Data: {
    "error": "WebSocket connection timeout"
  }
```

## 🔍 パフォーマンスへの影響

### ログレベル別のパフォーマンス影響

| レベル | CPU使用率 | メモリ使用量 | 推奨用途 |
|--------|-----------|-------------|----------|
| debug  | +5-10%    | +20MB       | 開発・デバッグ時 |
| info   | +2-3%     | +10MB       | 通常運用 |
| warn   | +1%       | +5MB        | 本番環境 |
| error  | ほぼ無し   | ほぼ無し     | 高負荷環境 |

## 💡 ベストプラクティス

### 開発時
```bash
# .env
LOG_LEVEL=debug
NODE_ENV=development
```

### ステージング環境
```bash
# .env
LOG_LEVEL=info
NODE_ENV=development
```

### 本番環境
```bash
# .env
LOG_LEVEL=warn
NODE_ENV=production
```

### トラブルシューティング時
```bash
# 一時的にdebugレベルに変更
LOG_LEVEL=debug npm run electron

# 特定のコンポーネントのみdebug（将来実装予定）
# LOG_LEVEL=info LOG_LEVEL_UNIFIED_PIPELINE=debug npm run electron
```

## 📁 ログファイルの場所

```
UniVoice/logs/
├── univoice-2025-09-26.jsonl    # 本日のログ
├── univoice-2025-09-25.jsonl    # 昨日のログ
└── ...
```

## 🛠️ ログ分析ツール

### エラーレベルのログのみを抽出
```bash
grep '"level":"error"' logs/univoice-$(date +%Y-%m-%d).jsonl | jq '.'
```

### 音声処理のパフォーマンスログを確認
```bash
grep '"Audio processing status"' logs/univoice-$(date +%Y-%m-%d).jsonl | jq '.data'
```

### ログレベル別の集計
```bash
cat logs/univoice-$(date +%Y-%m-%d).jsonl | jq -r '.level' | sort | uniq -c
```

## 🔄 今後の改善予定

1. **コンポーネント別ログレベル制御**
   ```bash
   LOG_LEVEL_DEFAULT=info
   LOG_LEVEL_UNIFIED_PIPELINE=debug
   LOG_LEVEL_DEEPGRAM_ADAPTER=warn
   ```

2. **動的ログレベル変更**
   - 実行中にログレベルを変更可能に

3. **ログローテーション**
   - 古いログの自動アーカイブ
   - ディスク容量の管理

4. **構造化ログの検索UI**
   - Web UIでのログ検索・フィルタリング

## 📚 関連ドキュメント

- [ログ出力とデバッグガイド](./LOGGING-AND-DEBUG-GUIDE.md)
- [環境変数設定例](./../.env.example)
- [アーキテクチャ設計書](./ARCHITECTURE.md)