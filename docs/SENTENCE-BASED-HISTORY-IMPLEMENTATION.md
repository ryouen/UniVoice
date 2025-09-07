# 文単位履歴管理システム実装記録

**⚠️ 重要な訂正（2025-08-30）**: このドキュメントは誤解を招く内容を含んでいます。
実際にはSentenceCombinerクラスは作成されましたが、**UnifiedPipelineServiceに統合されていません**。
現在の状態と実装計画については以下を参照してください：
- [START-HERE-UPDATED-20250830.md](../START-HERE-UPDATED-20250830.md)
- [SENTENCE-COMBINER-INTEGRATION-PLAN.md](SENTENCE-COMBINER-INTEGRATION-PLAN.md)

## 実装日時
2025-08-24（クラス作成のみ、統合は未完了）

## 実装内容（⚠️ 計画であり、実際には未統合）

### 1. SentenceCombinerクラス
- **ファイル**: `electron/services/domain/SentenceCombiner.ts`
- **機能**: 
  - Deepgramのセグメント（0.8秒区切り）を文単位に結合
  - 文末パターン（。．！？.!?）で自動判定
  - 2秒タイムアウトで強制結合
  - 最小2セグメント、最大10セグメントの制限

### 2. UnifiedPipelineServiceの拡張
- **ファイル**: `electron/services/domain/UnifiedPipelineService.ts`
- **追加内容**:
  - SentenceCombinerの統合（183-187行目）
  - processTranscriptSegmentでセグメント追加（533行目）
  - handleCombinedSentenceメソッド（886-905行目）
  - executeHistoryTranslationメソッド（911-981行目）
  - 翻訳ハンドラーの分岐処理（172-176行目）

### 3. 優先度制御の活用
- リアルタイム翻訳: `priority: 'normal'`
- 履歴用翻訳: `priority: 'low'`
- TranslationQueueManagerの既存機能を活用

### 4. フロントエンド対応
- **ファイル**: `src/hooks/useUnifiedPipeline.ts`
- **追加内容**: 履歴翻訳イベントの処理（402-415行目）

## 動作フロー

```
1. Deepgramからセグメント受信（0.8秒区切り）
   ↓
2. リアルタイム翻訳（通常優先度）で即座に表示
   ↓
3. SentenceCombinerで文単位に結合
   ↓
4. 文が完成したら履歴用翻訳を低優先度でキューイング
   ↓
5. バックグラウンドで高品質翻訳（gpt-5-mini）
   ↓
6. 翻訳完了後、履歴を更新
```

## 設計上の工夫

1. **既存機能への影響なし**
   - 優先度制御でリアルタイム翻訳を保護
   - エラー時も既存の翻訳を維持

2. **Response API使用の継続**
   - executeTranslationと同じパターン
   - streamingも同様に使用

3. **メモリ効率**
   - 最大10セグメントでバッファ制限
   - タイムアウトで自動クリーンアップ

## テスト方法

1. アプリケーションを起動
2. 音声認識を開始
3. DevTools ConsoleでLogを確認：
   - `[SentenceCombiner] Emitting combined sentence: X segments`
   - `[UnifiedPipelineService] History translation queued`
   - `[UnifiedPipelineService] History translation completed in Xms`

## 今後の改善案

1. FlexibleHistoryGrouperとの統合
2. 履歴UIでの高品質翻訳の表示
3. 差分表示機能（リアルタイム vs 高品質）
4. キュー圧迫時の自動調整機能

## ⚠️ 重要な実装上の注意事項（2025-08-30追記）

### ID管理の不整合について

現在の実装には以下の問題があります：

1. **ID体系の不一致**
   - 個別セグメント: `segment_XXX` 形式
   - 結合された文: `combined_TIMESTAMP_RANDOM` 形式
   - 履歴翻訳: `history_combined_TIMESTAMP_RANDOM` 形式

2. **データフローの断絶**
   - バックエンドで文を結合（SentenceCombiner）
   - 結合情報がフロントエンドに伝わらない
   - フロントエンドは個別セグメントIDで管理
   - 履歴翻訳は結合IDで来るため、マッチングできない

3. **解決策**
   - CombinedSentenceイベントを追加して、結合情報をフロントエンドに通知
   - FlexibleHistoryGrouperを結合文単位で管理するよう拡張
   - または、履歴翻訳イベントに元のセグメントIDマッピングを含める

この問題を解決しないと、高品質翻訳が履歴に反映されません。