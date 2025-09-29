# 履歴データ自動保存機能 設計書

## 概要

UniVoice 2.0のセッション履歴（英文/翻訳）を自動的に適切なフォルダに保存する機能を実装します。

## 保存データ構造

### 1. フォルダ構造
```
UniVoiceData/
├── sessions/
│   ├── 2025-08-22/
│   │   ├── session-001-morning-class/
│   │   │   ├── metadata.json
│   │   │   ├── history.json
│   │   │   ├── summary.json
│   │   │   └── report.md
│   │   └── session-002-afternoon-class/
│   │       └── ...
│   └── 2025-08-23/
│       └── ...
└── vocabulary/
    ├── 2025-08-22-vocabulary.json
    └── 2025-08-23-vocabulary.json
```

### 2. ファイル形式

#### metadata.json
```json
{
  "sessionId": "session-001-morning-class",
  "date": "2025-08-22",
  "startTime": "2025-08-22T09:00:00Z",
  "endTime": "2025-08-22T10:30:00Z",
  "className": "Advanced Physics",
  "sourceLanguage": "en",
  "targetLanguage": "ja",
  "duration": 5400,
  "version": "2.0.0"
}
```

#### history.json
```json
{
  "blocks": [
    {
      "id": "block_1755880123456",
      "sentences": [
        {
          "id": "segment-1755880123456-abcdef",
          "original": "Welcome to today's physics class.",
          "translation": "今日の物理の授業へようこそ。",
          "timestamp": 1755880123456
        }
      ],
      "createdAt": 1755880123456,
      "totalHeight": 120
    }
  ],
  "totalSegments": 150,
  "totalWords": 3500
}
```

#### summary.json
```json
{
  "summaries": [
    {
      "id": "summary-001",
      "timeRange": "00:00-10:00",
      "english": "The first ten minutes covered...",
      "japanese": "最初の10分間では...",
      "timestamp": 1755880600000
    }
  ]
}
```

## 実装方針

### 1. 保存タイミング
- **自動保存**: 5分ごと（設定可能）
- **手動保存**: ユーザーアクション時
- **セッション終了時**: 必ず保存

### 2. 保存場所
- **Windows**: `%USERPROFILE%/Documents/UniVoiceData/`
- **macOS**: `~/Documents/UniVoiceData/`
- **Linux**: `~/Documents/UniVoiceData/`

### 3. データ保存サービス

```typescript
// electron/services/domain/DataPersistenceService.ts
export class DataPersistenceService {
  private readonly basePath: string;
  private saveInterval: NodeJS.Timeout | null = null;
  
  async saveSession(sessionData: SessionData): Promise<void> {
    // セッションデータを保存
  }
  
  async loadSession(sessionId: string): Promise<SessionData> {
    // セッションデータを読み込み
  }
  
  startAutoSave(intervalMs: number = 300000): void {
    // 自動保存を開始（デフォルト5分）
  }
  
  stopAutoSave(): void {
    // 自動保存を停止
  }
}
```

### 4. Electron メインプロセスでの実装

```typescript
// electron/main.ts に追加
import { DataPersistenceService } from './services/domain/DataPersistenceService';

const dataPersistence = new DataPersistenceService();

// パイプライン開始時に自動保存開始
pipelineService.on('started', () => {
  dataPersistence.startAutoSave();
});

// パイプライン停止時に最終保存
pipelineService.on('stopped', async () => {
  await dataPersistence.saveSession(getCurrentSessionData());
  dataPersistence.stopAutoSave();
});
```

### 5. エクスポート機能

- **CSV形式**: 履歴データを表形式でエクスポート
- **Markdown形式**: レポートとして整形済みエクスポート
- **PDF形式**: 将来的に実装（Phase 2）

## セキュリティとプライバシー

- ローカル保存のみ（クラウド同期なし）
- ユーザーのドキュメントフォルダに保存
- 機密情報のマスキング機能（オプション）

## エラーハンドリング

- ディスク容量不足時の警告
- 書き込み権限エラーの処理
- 破損ファイルの検出と復旧

## 今後の拡張

1. **クラウドバックアップ**: ユーザー同意の上でクラウド保存
2. **データ分析**: 学習履歴の統計表示
3. **共有機能**: セッションデータの共有（匿名化オプション付き）