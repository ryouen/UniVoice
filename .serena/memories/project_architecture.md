# UniVoice 2.0 アーキテクチャ詳細

## アーキテクチャパターン
Clean Architecture + CQRS + Event-Driven + Hexagonal Architecture

## レイヤー構成

### 1. プレゼンテーション層（UI）
- **場所**: `src/`
- **責務**: ユーザーインターフェース、ユーザー入力処理
- **主要コンポーネント**:
  - `UniVoice.tsx`: メインUIコンポーネント
  - 各種Sectionコンポーネント（Setup, Control, Status, Transcription, History, Summary）
  - Hooks（useUnifiedPipeline, useAdvancedFeatures）

### 2. アプリケーション層
- **場所**: `electron/services/ipc/`
- **責務**: ユースケースの実装、プロセス間通信
- **主要コンポーネント**:
  - `IPCGateway`: 型安全なIPC通信
  - `contracts.ts`: イベント契約定義（Zod スキーマ）

### 3. ドメイン層
- **場所**: `electron/services/domain/`
- **責務**: ビジネスロジック、ドメインモデル
- **主要サービス**:
  - `UnifiedPipelineService`: 音声認識・翻訳の中央制御
  - `AdvancedFeatureService`: 要約・語彙・レポート生成
  - `SentenceCombiner`: 文単位の結合処理
  - `TranslationQueueManager`: 優先度付き翻訳キュー
  - `StreamCoalescer`: UI更新の最適化
  - `SegmentManager`: セグメント重複除去

### 4. インフラストラクチャ層
- **場所**: `electron/services/adapters/`
- **責務**: 外部サービスとの連携
- **アダプター**:
  - `DeepgramStreamAdapter`: Deepgram API連携
  - `OpenAIAdapter`: OpenAI API連携
  - モニタリングサービス（MetricsCollector, HealthChecker, TracingService）

## イベント駆動アーキテクチャ

### イベントフロー
1. **音声入力** → DeepgramStreamAdapter
2. **文字起こし** → TranscriptSegmentEvent
3. **翻訳キュー** → TranslationQueueManager
4. **翻訳完了** → TranslationUpdateEvent
5. **文結合** → CombinedSentenceEvent
6. **UI更新** → StreamCoalescer → React State

### 主要イベント
- `TranscriptSegmentEvent`: 音声認識セグメント
- `TranslationUpdateEvent`: 翻訳結果
- `CombinedSentenceEvent`: 結合された文
- `ProgressiveSummaryEvent`: プログレッシブ要約
- `VocabularyEvent`: 語彙抽出結果

## CQRS実装

### コマンド（Command）
- `StartListeningCommand`: 音声認識開始
- `StopListeningCommand`: 音声認識停止
- `UpdateLanguagesCommand`: 言語設定変更
- `GenerateSummaryCommand`: 要約生成

### クエリ（Query）
- `GetStateQuery`: 現在の状態取得
- `GetMetricsQuery`: メトリクス取得
- `GetSessionsQuery`: セッション一覧取得

## 型安全性の実装

### Zod検証
```typescript
// IPCイベントの型定義と検証
const TranscriptSegmentEventSchema = z.object({
  type: z.literal('transcript-segment'),
  payload: z.object({
    segmentId: z.string(),
    text: z.string(),
    timestamp: z.number(),
    isFinal: z.boolean()
  })
});
```

### Discriminated Union
```typescript
type PipelineEvent = 
  | TranscriptSegmentEvent
  | TranslationUpdateEvent
  | CombinedSentenceEvent
  | ErrorEvent;
```

## パフォーマンス最適化

### StreamCoalescer
- UI更新を160msでデバウンス
- 1100ms後に強制コミット
- 更新頻度を50%削減

### TranslationQueueManager
- 優先度付きキュー（High/Normal/Low）
- リアルタイム翻訳を優先
- バックグラウンドで高品質翻訳

### メモリ管理
- セグメントの定期的なクリーンアップ
- 履歴の最大保持数制限
- WeakMapによる参照管理

## エラーハンドリング戦略
1. **Result型パターン**: 例外ではなく結果型を返す
2. **エラーイベント**: ErrorEventで統一的に処理
3. **リトライ機構**: API呼び出しの自動リトライ
4. **グレースフルデグラデーション**: 機能の段階的縮退