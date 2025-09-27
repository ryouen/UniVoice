# ビルドエラー・命名規則不統一分析レポート

生成日: 2025-09-26  
作成者: Claude Code

## 1. 現在のビルドエラー

### 1.1 型エラー
```
electron/services/domain/UnifiedPipelineService.ts(762,9): 
error TS2353: Object literal may only specify known properties, and 'text' does not exist in type 'QueuedTranslation'.
```

**原因**: `QueuedTranslation`インターフェースの不整合
- 定義: `originalText`, `sourceLanguage`, `targetLanguage` (必須)
- 使用: `text`のみ、言語情報なし

### 1.2 未使用コードの警告
```
electron/services/domain/UnifiedPipelineService.ts(1242,17): 
error TS6133: 'handleTranscriptSegmentOLD' is declared but its value is never read.
```

## 2. 命名規則の不統一

### 2.1 翻訳テキストの命名
- **TranslationQueueManager**: `originalText` / `translatedText`
- **UnifiedPipelineService**: `text` (単純化)
- **SummaryService**: `english` / `japanese` (言語固定)

### 2.2 言語指定の命名
- **設計**: `sourceLanguage` / `targetLanguage` (多言語対応)
- **実装**: `english` / `japanese` (ハードコード)

## 3. 重複定義

### 3.1 TranscriptSegment
同一ファイル内で2回定義:
- `UnifiedPipelineService.ts:48`
- `UnifiedPipelineService.ts:94`

別ファイルでも定義:
- `SentenceCombiner.ts:18` (export付き)

## 4. TODO/技術的負債

### 4.1 高優先度
- `SummaryService.ts:40-41`: english/japanese → sourceText/targetText への変更
- `electron/main.ts:776`: 履歴取得の実装

### 4.2 中優先度
- `TranslationQueueManager.ts:150`: 指数バックオフでの再試行
- `UnifiedPipelineService.ts:693`: UtteranceEnd処理の実装

### 4.3 低優先度
- メトリクス計算の実装 (MetricsCollector)
- 音声レベルの実装 (UniVoice.tsx:2864)

## 5. 修正方針

### 5.1 即時修正（ビルドエラー解消）

1. **UnifiedPipelineService.ts:760-768**を修正:
```typescript
this.translationQueue.enqueue({
  segmentId: result.id,
  originalText: result.text,  // text → originalText
  sourceLanguage: this.currentSourceLanguage || 'ja',  // 追加
  targetLanguage: this.currentTargetLanguage || 'en',  // 追加
  timestamp: result.timestamp,
  priority: 'normal'
  // metadata プロパティは QueuedTranslation に存在しない
});
```

2. **未使用メソッドの削除**: `handleTranscriptSegmentOLD`

### 5.2 段階的修正（命名規則統一）

**Phase 1: 型定義の統一**
- `TranscriptSegment`を共通の場所で1回だけ定義
- 各ファイルからインポートして使用

**Phase 2: 言語固定の解消**
- `english`/`japanese` → `sourceText`/`targetText`
- 言語コードは`sourceLanguage`/`targetLanguage`で管理

**Phase 3: 一貫性のある命名規則**
- 原文: `originalText` または `sourceText` (統一)
- 訳文: `translatedText` または `targetText` (統一)
- 使用箇所を全て統一

## 6. リスクと影響範囲

### 6.1 高リスク領域
- 翻訳パイプライン全体（動作中のコード）
- フロントエンドとの連携部分

### 6.2 低リスク領域
- TODOコメントの解消
- メトリクス計算の実装

## 7. 推奨アクション

1. **即座に実行**: ビルドエラーの修正（5.1の内容）
2. **次のスプリント**: 型定義の統一とクリーンアップ
3. **長期計画**: 言語固定の解消と真の多言語対応

## 8. 関連ドキュメント

- [命名規則不統一問題レポート](NAMING-CONSISTENCY-ISSUES-20250926.md)
- [コードベース深層分析レポート](CODEBASE-DEEP-ANALYSIS-20250926.md)